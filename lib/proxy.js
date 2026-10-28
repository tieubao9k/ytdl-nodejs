'use strict';

const net = require('net');
const tls = require('tls');
const { URL } = require('url');

let globalProxy = null;
const agentCache = new Map();

/**
 * Thiết lập proxy mặc định toàn cục
 * @param {string|null} proxyUrl
 */
function setGlobalProxy(proxyUrl) {
    globalProxy = proxyUrl;
}

/**
 * Lấy proxy URL hiện tại (từ options, global, hoặc biến môi trường)
 */
function resolveProxyUrl(optionProxy) {
    if (optionProxy !== undefined) {
        return optionProxy;
    }
    if (globalProxy) {
        return globalProxy;
    }
    return process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.ALL_PROXY || null;
}

/**
 * Tạo Undici Agent với custom connector hỗ trợ HTTP/HTTPS/SOCKS proxy
 * @param {string} proxyUrl
 */
function createProxyAgent(proxyUrl) {
    if (!proxyUrl) return undefined;
    if (agentCache.has(proxyUrl)) {
        return agentCache.get(proxyUrl);
    }

    // Kích hoạt Undici Dispatcher của Node
    fetch('https://httpbin.org/get').catch(() => {});
    const dispatcher = globalThis[Symbol.for('undici.globalDispatcher.1')] ||
                       globalThis[Symbol.for('undici.globalDispatcher.2')];
    if (!dispatcher || !dispatcher.constructor) {
        return undefined;
    }

    const Agent = dispatcher.constructor;
    let parsed;
    try {
        parsed = new URL(proxyUrl);
    } catch (e) {
        throw new Error(`Định dạng proxy URL không hợp lệ: ${proxyUrl}`);
    }

    const isHttpsProxy = parsed.protocol === 'https:';
    const isSocks = parsed.protocol.startsWith('socks');
    const proxyHost = parsed.hostname;
    const proxyPort = parseInt(parsed.port || (isHttpsProxy ? 443 : (isSocks ? 1080 : 8080)), 10);
    const proxyAuth = (parsed.username || parsed.password)
        ? `${decodeURIComponent(parsed.username || '')}:${decodeURIComponent(parsed.password || '')}`
        : null;

    const agent = new Agent({
        connect: (opts, cb) => {
            const targetHost = opts.hostname;
            const targetPort = opts.port || (opts.protocol === 'https:' ? 443 : 80);

            const connectOpts = { host: proxyHost, port: proxyPort };
            const rawSocket = isHttpsProxy ? tls.connect(connectOpts) : net.connect(connectOpts);

            rawSocket.on('error', cb);

            if (isSocks) {
                // Hỗ trợ giao thức SOCKS5
                rawSocket.once('connect', () => {
                    const authMethods = proxyAuth ? [0x00, 0x02] : [0x00];
                    rawSocket.write(Buffer.from([0x05, authMethods.length, ...authMethods]));

                    rawSocket.once('data', (chunk) => {
                        const method = chunk[1];
                        if (method === 0x02 && proxyAuth) {
                            const [u, p] = proxyAuth.split(':');
                            const uBuf = Buffer.from(u || '');
                            const pBuf = Buffer.from(p || '');
                            rawSocket.write(Buffer.from([0x01, uBuf.length, ...uBuf, pBuf.length, ...pBuf]));
                            rawSocket.once('data', (authChunk) => {
                                if (authChunk[1] !== 0x00) {
                                    return cb(new Error('SOCKS5 xác thực thất bại (sai user/pass)'));
                                }
                                sendSocksConnect();
                            });
                        } else if (method === 0x00) {
                            sendSocksConnect();
                        } else {
                            return cb(new Error(`SOCKS5 phương thức xác thực không hỗ trợ: 0x${method.toString(16)}`));
                        }
                    });

                    function sendSocksConnect() {
                        const hostBuf = Buffer.from(targetHost);
                        const req = Buffer.from([
                            0x05, 0x01, 0x00, 0x03, hostBuf.length, ...hostBuf,
                            (targetPort >> 8) & 0xff, targetPort & 0xff
                        ]);
                        rawSocket.write(req);
                        rawSocket.once('data', (resp) => {
                            if (resp[1] !== 0x00) {
                                return cb(new Error(`SOCKS5 kết nối tới ${targetHost}:${targetPort} thất bại (mã: ${resp[1]})`));
                            }
                            if (opts.protocol === 'https:') {
                                const sec = tls.connect({ socket: rawSocket, servername: targetHost }, () => cb(null, sec));
                                sec.on('error', cb);
                            } else {
                                cb(null, rawSocket);
                            }
                        });
                    }
                });
            } else {
                // Hỗ trợ HTTP / HTTPS CONNECT tunneling
                rawSocket.once('connect', () => {
                    let connectReq = `CONNECT ${targetHost}:${targetPort} HTTP/1.1\r\nHost: ${targetHost}:${targetPort}\r\n`;
                    if (proxyAuth) {
                        connectReq += `Proxy-Authorization: Basic ${Buffer.from(proxyAuth).toString('base64')}\r\n`;
                    }
                    connectReq += `Proxy-Connection: Keep-Alive\r\n\r\n`;
                    rawSocket.write(connectReq);

                    let buf = Buffer.alloc(0);
                    const onData = (chunk) => {
                        buf = Buffer.concat([buf, chunk]);
                        const headerEnd = buf.indexOf('\r\n\r\n');
                        if (headerEnd !== -1) {
                            rawSocket.removeListener('data', onData);
                            const headerStr = buf.slice(0, headerEnd).toString('latin1');
                            const statusLine = headerStr.split('\r\n')[0];
                            if (!statusLine.includes('200')) {
                                return cb(new Error(`Proxy CONNECT lỗi: ${statusLine}`));
                            }
                            const rest = buf.slice(headerEnd + 4);
                            if (rest.length > 0) {
                                rawSocket.unshift(rest);
                            }
                            if (opts.protocol === 'https:') {
                                const sec = tls.connect({ socket: rawSocket, servername: targetHost }, () => cb(null, sec));
                                sec.on('error', cb);
                            } else {
                                cb(null, rawSocket);
                            }
                        }
                    };
                    rawSocket.on('data', onData);
                });
            }
        }
    });

    agentCache.set(proxyUrl, agent);
    return agent;
}

/**
 * Trả về dispatcher tương ứng với proxy (hoặc undefined nếu không dùng proxy)
 */
function getDispatcher(proxyOption) {
    const proxyUrl = resolveProxyUrl(proxyOption);
    if (!proxyUrl) return undefined;
    return createProxyAgent(proxyUrl);
}

module.exports = {
    setGlobalProxy,
    resolveProxyUrl,
    createProxyAgent,
    getDispatcher
};

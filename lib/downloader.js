'use strict';

const fs = require('fs');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');
const { getDispatcher } = require('./proxy');
const { parseCookies } = require('./cookie');

/**
 * Tải trực tiếp progressive stream (itag 18) không cần FFmpeg
 */
async function downloadDirectStream(streamUrl, destPath, label = 'Tải stream', options = {}) {
    const dispatcher = getDispatcher(options.proxy);
    const cookieData = parseCookies(options.cookie);

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://music.youtube.com',
        'Referer': 'https://music.youtube.com/',
    };
    if (cookieData?.cookieHeader) {
        headers['Cookie'] = cookieData.cookieHeader;
    }

    const fetchOpts = { headers };
    if (dispatcher) {
        fetchOpts.dispatcher = dispatcher;
    }

    const resp = await fetch(streamUrl, fetchOpts);

    if (!resp.ok) {
        throw new Error(`Lỗi tải stream HTTP ${resp.status}`);
    }

    const totalLength = parseInt(resp.headers.get('content-length') || '0', 10);
    let downloaded = 0;
    const startTime = Date.now();
    let lastLogTime = 0;

    const destStream = fs.createWriteStream(destPath);
    const webReader = resp.body.getReader();

    const nodeReadable = new Readable({
        async read() {
            try {
                const { done, value } = await webReader.read();
                if (done) {
                    this.push(null);
                    return;
                }
                downloaded += value.length;
                const now = Date.now();
                if (now - lastLogTime >= 400) {
                    lastLogTime = now;
                    const elapsed = (now - startTime) / 1000;
                    const speed = elapsed > 0 ? (downloaded / elapsed / 1024 / 1024).toFixed(2) : '0';
                    const pct = totalLength > 0 ? ((downloaded / totalLength) * 100).toFixed(1) : '?';
                    if (process.stdout.isTTY) {
                        process.stdout.write(`\r[+] ${label}: ${pct}% [${(downloaded / 1024 / 1024).toFixed(2)} MB] @ ${speed} MB/s `);
                    }
                }
                this.push(Buffer.from(value));
            } catch (err) {
                this.destroy(err);
            }
        }
    });

    await pipeline(nodeReadable, destStream);
    const totalElapsed = (Date.now() - startTime) / 1000;
    const avgSpeed = totalElapsed > 0 ? (downloaded / totalElapsed / 1024 / 1024).toFixed(2) : '0';
    console.log(`[+] ${label}: Hoàn tất [${(downloaded / 1024 / 1024).toFixed(2)} MB @ ${avgSpeed} MB/s]`);
}

/**
 * Tải audio stream itag 140 bằng HTTP Range chunked requests không cần FFmpeg
 */
async function downloadChunkedStream(streamUrl, destPath, totalLen, label = 'Tải itag 140', options = {}) {
    const dispatcher = getDispatcher(options.proxy);
    const cookieData = parseCookies(options.cookie);

    const destStream = fs.createWriteStream(destPath);
    const chunkSize = 256 * 1024;
    let start = 0;
    let downloaded = 0;
    const startTime = Date.now();

    while (start < totalLen) {
        const end = Math.min(start + chunkSize - 1, totalLen - 1);

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Origin': 'https://music.youtube.com',
            'Referer': 'https://music.youtube.com/',
            'Range': `bytes=${start}-${end}`
        };
        if (cookieData?.cookieHeader) {
            headers['Cookie'] = cookieData.cookieHeader;
        }

        const fetchOpts = { headers };
        if (dispatcher) {
            fetchOpts.dispatcher = dispatcher;
        }

        const resp = await fetch(streamUrl, fetchOpts);

        if (resp.status !== 206 && resp.status !== 200) {
            console.warn(`[!] Cảnh báo: Stream dừng tại byte ${start} (HTTP ${resp.status})`);
            break;
        }

        const buf = Buffer.from(await resp.arrayBuffer());
        destStream.write(buf);
        downloaded += buf.length;
        start = end + 1;

        if (process.stdout.isTTY) {
            const elapsed = (Date.now() - startTime) / 1000;
            const speed = elapsed > 0 ? (downloaded / elapsed / 1024 / 1024).toFixed(2) : '0';
            const pct = totalLen > 0 ? ((downloaded / totalLen) * 100).toFixed(1) : '?';
            process.stdout.write(`\r[+] ${label}: ${pct}% [${(downloaded / 1024 / 1024).toFixed(2)} / ${(totalLen / 1024 / 1024).toFixed(2)} MB] @ ${speed} MB/s `);
        }
    }

    destStream.end();
    await new Promise(resolve => destStream.on('finish', resolve));

    const totalElapsed = (Date.now() - startTime) / 1000;
    const avgSpeed = totalElapsed > 0 ? (downloaded / totalElapsed / 1024 / 1024).toFixed(2) : '0';
    console.log(`\n[+] ${label}: Hoàn tất [${(downloaded / 1024 / 1024).toFixed(2)} MB @ ${avgSpeed} MB/s]`);
}

module.exports = {
    downloadDirectStream,
    downloadChunkedStream
};

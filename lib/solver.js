const fs = require('fs');
const path = require('path');
const vm = require('vm');

const CACHE_DIR = path.join(__dirname, '..', 'cache');
const BASE_JS_PATH = path.join(CACHE_DIR, 'base.js');

const { getDispatcher } = require('./proxy');

let cachedSolver = null;

/**
 * Đảm bảo file base.js tồn tại trong thư mục cache, tự động tải nếu thiếu
 */
async function ensureBaseJs(options = {}) {
    if (fs.existsSync(BASE_JS_PATH)) return;

    fs.mkdirSync(CACHE_DIR, { recursive: true });
    console.log('[+] Đang cập nhật base.js từ music.youtube.com...');
    try {
        const dispatcher = getDispatcher(options.proxy);
        const fetchOpts = {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        };
        if (dispatcher) fetchOpts.dispatcher = dispatcher;

        const resp = await fetch('https://music.youtube.com', fetchOpts);
        const html = await resp.text();
        const m = html.match(/"jsUrl":"([^"]+base\.js)"/) || html.match(/src="([^"]+player[^"]+base\.js)"/);
        if (m) {
            const playerUrl = new URL(m[1], 'https://music.youtube.com').href;
            const r = await fetch(playerUrl, fetchOpts);
            const script = await r.text();
            fs.writeFileSync(BASE_JS_PATH, script, 'utf8');
            console.log(`[+] Đã lưu base.js vào ${BASE_JS_PATH}`);
        } else {
            throw new Error('Không tìm thấy link base.js trên YouTube Music.');
        }
    } catch (e) {
        console.warn(`[!] Cảnh báo tải base.js: ${e.message}`);
    }
}

/**
 * Khởi tạo bộ giải mã cipher và de-throttle n-sig trong NodeJS VM
 */
async function getSolver(options = {}) {
    if (cachedSolver) return cachedSolver;

    await ensureBaseJs(options);

    if (!fs.existsSync(BASE_JS_PATH)) {
        throw new Error(`Tệp base.js không tồn tại tại: ${BASE_JS_PATH}`);
    }

    let code = fs.readFileSync(BASE_JS_PATH, 'utf8');
    const hook = `
g.solveStreamUrl = function(url, sp, s) {
    var a = EI(url, sp, s);
    a.get('n');
    return a.Ie();
};
`;
    if (!code.includes('g.solveStreamUrl')) {
        code = code.replace('})(_yt_player);', hook + '})(_yt_player);');
    }

    const sandbox = {
        console, Date, Math, RegExp, Array, Object, String, Number, parseInt, parseFloat,
        encodeURIComponent, decodeURIComponent, setTimeout: () => {}, clearTimeout: () => {},
    };
    sandbox.window = sandbox;
    sandbox.self = sandbox;
    sandbox.document = { createElement: () => ({}), documentElement: {}, getElementsByTagName: () => [], cookie: '' };
    sandbox.navigator = { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
    sandbox.location = { href: 'https://music.youtube.com', origin: 'https://music.youtube.com', hostname: 'music.youtube.com' };
    sandbox.XMLHttpRequest = class { open() {} send() {} };

    const ctx = vm.createContext(sandbox);
    vm.runInContext(code, ctx);

    cachedSolver = {
        solveStreamUrl: (url, sp, s) => {
            return sandbox._yt_player.solveStreamUrl(url, sp || 'sig', s || '');
        }
    };
    return cachedSolver;
}

/**
 * Giải mã URL stream từ format object (giải mã signature & de-throttle n-sig)
 */
function resolveStreamUrl(solver, formatObj) {
    if (formatObj.url) {
        // De-throttle n parameter trong direct URL
        return solver.solveStreamUrl(formatObj.url, 'sig', '');
    }
    const cipher = formatObj.signatureCipher || formatObj.cipher;
    if (cipher) {
        const q = new URLSearchParams(cipher);
        const rawUrl = q.get('url');
        const sp = q.get('sp') || 'sig';
        const s = q.get('s');
        return solver.solveStreamUrl(rawUrl, sp, s);
    }
    throw new Error(`Không tìm thấy URL hoặc Cipher cho itag ${formatObj.itag}`);
}

module.exports = {
    getSolver,
    resolveStreamUrl,
    ensureBaseJs,
    BASE_JS_PATH
};

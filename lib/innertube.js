'use strict';

const { getDispatcher } = require('./proxy');
const { parseCookies } = require('./cookie');

const DEFAULT_VISITOR_DATA = (
    'CgtjaE5CZ3o0YXpHVSia7ITXBjIKCgJWThIEGgAgNWKqAgqnAkN0b0JDQVVTakFFQkRCNlBEQkg0aXo5' +
    'cXdfU25iR1dYTUlDV1ZPRVNMNUxVSjVJU2ltMDZzeHNwZm9PQVlrMlQzUlVMMERtVzFhdGRwd0ZmNm1V' +
    'U3NlTURmWjVUc2tCVkk1X2FGeHNHS3ZBNmdaNVJCZEQxdTlFSEs5WGQxVXExdEh3Qk03eEtKZzJLdjFV' +
    'aXczT0VmdkRDcmZMLVItNnQtQ1RjYl9sU19rNG1zeFNVS01aQkExeUdXN3UtYmpQWWM1U0xmaWdGTWtV' +
    'QkhGajFhZzh1LXpPSWtDeDlPSTVJMnFzbWkydXlmWGVURVBhaTViMkQxd1RNVVdPU0VHUXFxTTZmSXYz' +
    'VE9nY25zaUpKOVpNWE9sTmZCemp1bmt6Qnc0TGtKd1U%3D'
);
const SIGNATURE_TIMESTAMP = 20751;

/**
 * Trích xuất 11 ký tự Video ID từ bất kỳ dạng Link (URL) hoặc chuỗi ID
 */
function extractVideoId(urlOrId) {
    if (!urlOrId || typeof urlOrId !== 'string') {
        throw new Error('Video ID hoặc URL không hợp lệ.');
    }
    const clean = urlOrId.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
        return clean;
    }
    try {
        const parsed = new URL(clean.startsWith('http') ? clean : `https://${clean}`);
        if (parsed.searchParams.has('v')) {
            const v = parsed.searchParams.get('v');
            if (/^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
        }
        const pathname = parsed.pathname;
        const pathMatch = pathname.match(/\/(?:embed|v|shorts|live)\/([a-zA-Z0-9_-]{11})/);
        if (pathMatch) return pathMatch[1];

        if (parsed.hostname.includes('youtu.be')) {
            const beMatch = pathname.match(/^\/([a-zA-Z0-9_-]{11})/);
            if (beMatch) return beMatch[1];
        }
    } catch (_) {}

    const genericMatch = clean.match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/|\/live\/|\/v\/)([a-zA-Z0-9_-]{11})/);
    if (genericMatch) return genericMatch[1];

    if (/^[a-zA-Z0-9_-]{11}$/.test(clean.substring(0, 11))) {
        return clean.substring(0, 11);
    }
    return clean;
}

/**
 * Lọc ký tự hợp lệ cho tên file trên hệ điều hành
 */
function sanitizeFilename(name) {
    return name
        .replace(/[\\/*?:"<>|]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Gọi API youtubei/v1/player với cấu hình client cụ thể, hỗ trợ proxy và cookies
 */
async function requestPlayer(videoId, clientConfig, options = {}) {
    const cookieData = parseCookies(options.cookie, clientConfig.origin);
    const dispatcher = getDispatcher(options.proxy);

    const headers = {
        'Content-Type': 'application/json',
        'User-Agent': clientConfig.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'X-Youtube-Client-Name': clientConfig.clientId,
        'X-Youtube-Client-Version': clientConfig.clientVersion,
        'X-Goog-Visitor-Id': DEFAULT_VISITOR_DATA,
        'Origin': clientConfig.origin,
        'Referer': clientConfig.referer,
    };

    if (cookieData?.cookieHeader) {
        headers['Cookie'] = cookieData.cookieHeader;
    }
    if (cookieData?.authHeader) {
        headers['Authorization'] = cookieData.authHeader;
    }

    const contextClient = {
        clientName: clientConfig.clientName,
        clientVersion: clientConfig.clientVersion,
        hl: options.hl || 'vi',
        gl: options.gl || 'VN',
        visitorData: DEFAULT_VISITOR_DATA,
    };

    const reqBody = {
        context: {
            client: contextClient,
            user: {
                lockedSafetyMode: false
            }
        },
        videoId,
        playbackContext: {
            contentPlaybackContext: {
                html5Preference: 'HTML5_PREF_WANTS',
                signatureTimestamp: SIGNATURE_TIMESTAMP,
            }
        }
    };

    const fetchOpts = {
        method: 'POST',
        headers,
        body: JSON.stringify(reqBody)
    };

    if (dispatcher) {
        fetchOpts.dispatcher = dispatcher;
    }

    const res = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', fetchOpts);

    if (!res.ok) {
        throw new Error(`YTM API request thất bại với HTTP status: ${res.status}`);
    }

    return await res.json();
}

/**
 * Lấy thông tin player:
 * 1. Mặc định dùng WEB_REMIX cho YouTube Music
 * 2. Tự động fallback sang MWEB nếu video không thuộc danh mục nhạc (hoạt hình, vlog, tutorial...)
 * @param {string} videoId
 * @param {object} [options] - Tùy chọn proxy, cookie, hl, gl
 */
async function getPlayerInfo(videoId, options = {}) {
    // Thử client WEB_REMIX trước
    try {
        const remixData = await requestPlayer(videoId, {
            clientName: 'WEB_REMIX',
            clientVersion: '1.20261025.12.00',
            clientId: '67',
            origin: 'https://music.youtube.com',
            referer: 'https://music.youtube.com/',
        }, options);

        if (remixData.playabilityStatus?.status === 'OK' && (remixData.streamingData?.formats || remixData.streamingData?.adaptiveFormats)) {
            return remixData;
        }
    } catch (_) {}

    // Fallback sang MWEB (YouTube Web Mobile)
    const mwebData = await requestPlayer(videoId, {
        clientName: 'MWEB',
        clientVersion: '2.20241025.01.00',
        clientId: '2',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        origin: 'https://m.youtube.com',
        referer: 'https://m.youtube.com/',
    }, options);

    const status = mwebData.playabilityStatus?.status;
    if (status !== 'OK') {
        const reason = mwebData.playabilityStatus?.reason || 'Không rõ nguyên nhân';
        throw new Error(`YouTube trả về trạng thái '${status}': ${reason}`);
    }

    return mwebData;
}

module.exports = {
    extractVideoId,
    sanitizeFilename,
    getPlayerInfo,
    requestPlayer
};

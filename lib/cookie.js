'use strict';

const fs = require('fs');
const crypto = require('crypto');

let globalCookie = null;

/**
 * Đặt cookie mặc định toàn cục
 * @param {string|object|Array} cookie
 */
function setGlobalCookie(cookie) {
    globalCookie = cookie;
}

/**
 * Phân tích và chuẩn hóa cookies từ nhiều định dạng:
 * - Chuỗi cookie ("SID=xxx; HSID=yyy; SAPISID=zzz")
 * - Đường dẫn file Netscape cookies.txt ("# Netscape HTTP Cookie File...")
 * - Đường dẫn file JSON hoặc mảng JSON objects ([{ name, value }])
 * - Object key-value ({ SID: "xxx", SAPISID: "zzz" })
 * 
 * @param {string|object|Array|null} input
 * @param {string} [origin='https://music.youtube.com']
 * @returns {{ cookieHeader: string, authHeader: string|null, sapisid: string|null, cookies: Record<string, string> } | null}
 */
function parseCookies(input, origin = 'https://music.youtube.com') {
    const raw = (input !== undefined && input !== null) ? input : globalCookie;
    if (!raw) return null;

    const cookieMap = {};

    if (typeof raw === 'string') {
        // Kiểm tra xem input có phải là đường dẫn file hay không
        if (fs.existsSync(raw)) {
            const content = fs.readFileSync(raw, 'utf-8');
            parseCookieStringOrFileContent(content, cookieMap);
        } else {
            parseCookieStringOrFileContent(raw, cookieMap);
        }
    } else if (Array.isArray(raw)) {
        for (const item of raw) {
            if (item && item.name && item.value !== undefined) {
                cookieMap[item.name] = item.value;
            }
        }
    } else if (typeof raw === 'object') {
        for (const [key, val] of Object.entries(raw)) {
            if (val !== undefined && val !== null) {
                cookieMap[key] = String(val);
            }
        }
    }

    const keys = Object.keys(cookieMap);
    if (keys.length === 0) return null;

    const cookieHeader = keys.map(k => `${k}=${cookieMap[k]}`).join('; ');

    // Trích xuất SAPISID để tạo SAPISIDHASH (chuẩn xác thực của YouTube API)
    const sapisid = cookieMap['SAPISID'] ||
                    cookieMap['__Secure-3PAPISID'] ||
                    cookieMap['__Secure-1PAPISID'] ||
                    null;

    let authHeader = null;
    if (sapisid) {
        const timestamp = Math.floor(Date.now() / 1000);
        const hash = crypto.createHash('sha1')
            .update(`${timestamp} ${sapisid} ${origin}`)
            .digest('hex');
        authHeader = `SAPISIDHASH ${timestamp}_${hash}`;
    }

    return {
        cookieHeader,
        authHeader,
        sapisid,
        cookies: cookieMap
    };
}

/**
 * Phân tích nội dung chuỗi (Netscape hoặc header thông thường)
 */
function parseCookieStringOrFileContent(content, cookieMap) {
    const trimmed = content.trim();

    // 1. Kiểm tra JSON
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                for (const item of parsed) {
                    if (item && item.name) cookieMap[item.name] = item.value || '';
                }
            } else if (typeof parsed === 'object') {
                for (const [k, v] of Object.entries(parsed)) {
                    cookieMap[k] = String(v);
                }
            }
            return;
        } catch (e) {
            // Không phải JSON hợp lệ, tiếp tục xử lý văn bản
        }
    }

    // 2. Netscape format hoặc từng dòng
    const lines = content.split(/\r?\n/);
    let isNetscape = false;

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        if (line.startsWith('# Netscape HTTP Cookie File')) {
            isNetscape = true;
            continue;
        }

        if (line.startsWith('#HttpOnly_')) {
            line = line.substring(10);
            isNetscape = true;
        } else if (line.startsWith('#')) {
            continue;
        }

        // Tách tab cho Netscape format: domain \t flag \t path \t secure \t expiration \t name \t value
        const tabs = line.split('\t');
        if (tabs.length >= 7) {
            const name = tabs[5].trim();
            const value = tabs[6].trim();
            if (name) {
                cookieMap[name] = value;
                isNetscape = true;
            }
            continue;
        }

        // Tách chuỗi cookie thông thường "key=val; key2=val2"
        const pairs = line.split(';');
        for (const pair of pairs) {
            const idx = pair.indexOf('=');
            if (idx > 0) {
                const name = pair.substring(0, idx).trim();
                const value = pair.substring(idx + 1).trim();
                if (name && !name.startsWith('#')) {
                    cookieMap[name] = value;
                }
            }
        }
    }
}

module.exports = {
    setGlobalCookie,
    parseCookies
};

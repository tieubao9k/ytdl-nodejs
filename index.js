'use strict';

const fs = require('fs');
const path = require('path');
const { extractVideoId, sanitizeFilename, getPlayerInfo } = require('./lib/innertube');
const { getSolver, resolveStreamUrl } = require('./lib/solver');
const { downloadDirectStream, downloadChunkedStream } = require('./lib/downloader');
const { search, searchMusic, searchWeb } = require('./lib/search');
const { setGlobalProxy, resolveProxyUrl } = require('./lib/proxy');
const { setGlobalCookie, parseCookies } = require('./lib/cookie');

/**
 * Lấy trực tiếp Video ID và Link stream Google Video giải mã sẵn (không tải file về đĩa)
 * @param {string|Object} urlOrId - URL hoặc Video ID hoặc Object options
 * @param {string} [format='audio'] - 'video' (itag 18 360p) hoặc 'audio' (itag 140 AAC)
 * @param {Object} [options={}] - { proxy, cookie, hl, gl }
 * @returns {Promise<Object>} { id, link, title, author, durationSeconds, format, itag, mimeType, contentLength }
 */
async function getLink(urlOrId, format = 'audio', options = {}) {
    let target = urlOrId;
    let fmt = format;
    let opts = options;

    if (typeof urlOrId === 'object' && urlOrId !== null) {
        target = urlOrId.videoId || urlOrId.url || urlOrId.id || urlOrId.link;
        fmt = urlOrId.format || format || 'audio';
        opts = Object.assign({}, urlOrId, options);
    } else if (typeof format === 'object' && format !== null) {
        opts = format;
        fmt = opts.format || 'audio';
    }

    const id = extractVideoId(target);
    const normalizedFormat = String(fmt).toLowerCase().trim();
    const isVideoMode = ['video', '360', 'mp4'].includes(normalizedFormat);

    console.log(`[+] Đang lấy Link + ID từ YouTube Music (WEB_REMIX) cho: ${id}...`);

    const [playerData, solver] = await Promise.all([
        getPlayerInfo(id, opts),
        getSolver(opts)
    ]);

    const videoDetails = playerData.videoDetails || {};
    const title = videoDetails.title || `ytm_${id}`;
    const author = videoDetails.author || 'Unknown Artist';
    const durationSeconds = parseInt(videoDetails.lengthSeconds || '0', 10);

    const progFormats = playerData.streamingData?.formats || [];
    const adapFormats = playerData.streamingData?.adaptiveFormats || [];

    let chosenFormat;
    if (isVideoMode) {
        chosenFormat = progFormats.find(f => f.itag === 18) || progFormats.find(f => f.mimeType?.startsWith('video/mp4'));
        if (!chosenFormat) throw new Error('Không tìm thấy stream progressive video 360p (itag 18).');
    } else {
        chosenFormat = adapFormats.find(f => f.itag === 140) || adapFormats.find(f => f.mimeType?.startsWith('audio/mp4'));
        if (!chosenFormat) throw new Error('Không tìm thấy stream audio itag 140.');
    }

    const streamUrl = resolveStreamUrl(solver, chosenFormat);

    return {
        id,
        link: streamUrl,
        title,
        author,
        durationSeconds,
        format: isVideoMode ? 'video' : 'audio',
        itag: chosenFormat.itag,
        mimeType: chosenFormat.mimeType,
        contentLength: chosenFormat.contentLength || null
    };
}

/**
 * Hàm ytdl tải file về đĩa:
 * Nhận cả Link (URL) lẫn Video ID, không dùng FFmpeg, không dùng Python
 * Hỗ trợ proxy, cookie login, và tự chọn định dạng âm thanh / hình ảnh
 * 
 * @param {string|Object} videoIdOrUrlOrOptions - Video ID / URL hoặc Object options
 * @param {string} [pathArg] - Thư mục hoặc file đích
 * @param {string} [formatArg='audio'] - 'video' (360p MP4 kèm audio) hoặc 'audio' (itag 140 M4A)
 * @param {Object} [optionsArg={}] - Tùy chọn nâng cao { proxy, cookie, hl, gl }
 * @returns {Promise<Object>}
 */
async function ytdl(videoIdOrUrlOrOptions, pathArg, formatArg, optionsArg = {}) {
    let inputTarget, destPath, format, opts;

    if (typeof videoIdOrUrlOrOptions === 'object' && videoIdOrUrlOrOptions !== null) {
        inputTarget = videoIdOrUrlOrOptions.videoId || videoIdOrUrlOrOptions.url || videoIdOrUrlOrOptions.id || videoIdOrUrlOrOptions.link;
        destPath = videoIdOrUrlOrOptions.path || videoIdOrUrlOrOptions.outputPath || videoIdOrUrlOrOptions.output;
        format = videoIdOrUrlOrOptions.format || 'audio';
        opts = Object.assign({}, videoIdOrUrlOrOptions, optionsArg);
    } else {
        inputTarget = videoIdOrUrlOrOptions;
        destPath = pathArg;
        format = formatArg || 'audio';
        opts = optionsArg;
    }

    if (!inputTarget) throw new Error("Tham số 'videoId' hoặc 'url' là bắt buộc.");
    if (!destPath) throw new Error("Tham số 'path' là bắt buộc.");

    const info = await getLink(inputTarget, format, opts);
    const { id, link: streamUrl, title, author, durationSeconds, format: chosenFormat, itag } = info;
    const isVideoMode = chosenFormat === 'video';
    const targetExt = isVideoMode ? 'mp4' : 'm4a';

    const sanitizedTitle = sanitizeFilename(title);
    const sanitizedAuthor = sanitizeFilename(author);

    console.log(`🎵 Tiêu đề : ${title}`);
    console.log(`👤 Nghệ sĩ : ${author}`);
    console.log(`⏱  Thời lượng: ${Math.floor(durationSeconds / 60)}p ${durationSeconds % 60}s`);

    // Xác định đường dẫn file đầu ra
    let finalOutputPath;
    const isDir = fs.existsSync(destPath) && fs.statSync(destPath).isDirectory();
    const endsWithSlash = destPath.endsWith('/') || destPath.endsWith('\\');

    if (isDir || endsWithSlash) {
        fs.mkdirSync(destPath, { recursive: true });
        const defaultFilename = sanitizedAuthor !== 'Unknown Artist'
            ? `${sanitizedAuthor} - ${sanitizedTitle}.${targetExt}`
            : `${sanitizedTitle}.${targetExt}`;
        finalOutputPath = path.join(destPath, defaultFilename);
    } else {
        const parentDir = path.dirname(destPath);
        if (parentDir && !fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
        }
        if (destPath.endsWith('.mp3')) {
            finalOutputPath = destPath.replace(/\.mp3$/i, '.m4a');
        } else {
            finalOutputPath = destPath;
        }
    }

    if (isVideoMode) {
        console.log(`[+] Đang tải Video 360p đầy đủ âm thanh (itag ${itag}) - Không dùng FFmpeg...`);
        await downloadDirectStream(streamUrl, finalOutputPath, 'Tải Video 360p (MP4)', opts);
    } else {
        console.log(`[+] Đang tải Audio itag ${itag} (AAC M4A) - Không dùng FFmpeg...`);
        const totalLen = parseInt(info.contentLength || '0', 10);
        if (totalLen > 0) {
            await downloadChunkedStream(streamUrl, finalOutputPath, totalLen, 'Tải Audio itag 140', opts);
        } else {
            await downloadDirectStream(streamUrl, finalOutputPath, 'Tải Audio itag 140', opts);
        }
    }

    const fileSize = fs.existsSync(finalOutputPath) ? fs.statSync(finalOutputPath).size : 0;
    console.log(`\n[✓ THÀNH CÔNG] Đã tải xong!`);
    console.log(`🆔 ID Video: ${id}`);
    console.log(`👉 Đường dẫn: ${finalOutputPath}`);
    console.log(`📦 Dung lượng: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

    return {
        success: true,
        id,
        link: streamUrl,
        filePath: finalOutputPath,
        title,
        author,
        durationSeconds,
        format: chosenFormat,
        itag,
        fileSize
    };
}

// Gán các phương thức bổ trợ vào hàm ytdl
ytdl.ytdl = ytdl;
ytdl.getLink = getLink;
ytdl.getInfo = getLink;
ytdl.search = search;
ytdl.searchMusic = searchMusic;
ytdl.searchWeb = searchWeb;
ytdl.extractVideoId = extractVideoId;
ytdl.getPlayerInfo = getPlayerInfo;
ytdl.setProxy = setGlobalProxy;
ytdl.setCookie = setGlobalCookie;
ytdl.parseCookies = parseCookies;

module.exports = ytdl;
module.exports.ytdl = ytdl;
module.exports.getLink = getLink;
module.exports.getInfo = getLink;
module.exports.search = search;
module.exports.searchMusic = searchMusic;
module.exports.searchWeb = searchWeb;
module.exports.extractVideoId = extractVideoId;
module.exports.getPlayerInfo = getPlayerInfo;
module.exports.setProxy = setGlobalProxy;
module.exports.setCookie = setGlobalCookie;
module.exports.parseCookies = parseCookies;

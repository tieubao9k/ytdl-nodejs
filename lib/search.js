'use strict';

const { getDispatcher } = require('./proxy');
const { parseCookies } = require('./cookie');

/**
 * Tìm kiếm trên YouTube Music (WEB_REMIX)
 */
async function searchMusic(query, options = {}) {
    const limit = options.limit || 10;
    const hl = options.hl || 'vi';
    const gl = options.gl || 'VN';

    const cookieData = parseCookies(options.cookie, 'https://music.youtube.com');
    const dispatcher = getDispatcher(options.proxy);

    const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        'Origin': 'https://music.youtube.com',
        'Referer': 'https://music.youtube.com/',
        'X-YouTube-Client-Name': '67',
        'X-YouTube-Client-Version': '1.20250210.01.00'
    };

    if (cookieData?.cookieHeader) {
        headers['Cookie'] = cookieData.cookieHeader;
    }
    if (cookieData?.authHeader) {
        headers['Authorization'] = cookieData.authHeader;
    }

    const body = {
        context: {
            client: {
                clientName: 'WEB_REMIX',
                clientVersion: '1.20250210.01.00',
                hl,
                gl
            },
            user: {
                lockedSafetyMode: false
            }
        },
        query
    };

    const fetchOpts = {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    };
    if (dispatcher) {
        fetchOpts.dispatcher = dispatcher;
    }

    const resp = await fetch('https://music.youtube.com/youtubei/v1/search?prettyPrint=false', fetchOpts);
    if (!resp.ok) {
        throw new Error(`Lỗi tìm kiếm YouTube Music: HTTP ${resp.status}`);
    }

    const data = await resp.json();
    const results = [];

    const sections = data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];

    for (const section of sections) {
        const shelf = section.musicCardShelfRenderer || section.musicShelfRenderer || section.itemSectionRenderer;
        if (!shelf) continue;

        // Nếu là musicCardShelfRenderer (top result card)
        if (section.musicCardShelfRenderer) {
            const card = section.musicCardShelfRenderer;
            const cardTitle = card.title?.runs?.map(r => r.text).join('') || '';
            const cardSubtitle = card.subtitle?.runs?.map(r => r.text).join('') || '';
            const cardVideoId = card.onTap?.watchEndpoint?.videoId ||
                                card.buttons?.find(b => b.buttonRenderer?.command?.watchEndpoint)?.buttonRenderer?.command?.watchEndpoint?.videoId;

            if (cardVideoId && results.every(r => r.id !== cardVideoId)) {
                results.push({
                    id: cardVideoId,
                    title: cardTitle,
                    author: cardSubtitle,
                    duration: '',
                    type: 'music',
                    thumbnail: card.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${cardVideoId}/hqdefault.jpg`,
                    url: `https://music.youtube.com/watch?v=${cardVideoId}`
                });
            }
        }

        const items = shelf.contents || [];
        for (const item of items) {
            if (results.length >= limit) break;

            const r = item.musicResponsiveListItemRenderer;
            if (!r) continue;

            const flex0 = r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs;
            const flex1 = r.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs;

            const title = flex0?.map(x => x.text).join('') || '';
            const subtitle = flex1?.map(x => x.text).join('') || '';

            // Lấy videoId từ các vị trí khả dĩ
            const videoId = r.playlistItemData?.videoId ||
                            r.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId ||
                            r.navigationEndpoint?.watchEndpoint?.videoId;

            if (!videoId || results.some(res => res.id === videoId)) {
                continue;
            }

            // Phân tích subtitle (thường có dạng: "Bài hát • Tên ca sĩ • Thời lượng" hoặc "Video • Kênh • Lượt xem")
            const parts = subtitle.split('•').map(p => p.trim());
            let author = '';
            let duration = '';
            if (parts.length >= 2) {
                author = parts[1];
                if (parts.length >= 3 && parts[2].includes(':')) {
                    duration = parts[2];
                } else if (parts[1].includes(':')) {
                    duration = parts[1];
                    author = parts[0];
                }
            } else {
                author = subtitle;
            }

            const thumbnails = r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
            const thumbnail = thumbnails.length > 0
                ? thumbnails[thumbnails.length - 1].url
                : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

            results.push({
                id: videoId,
                title,
                author,
                duration,
                type: 'music',
                thumbnail,
                url: `https://music.youtube.com/watch?v=${videoId}`
            });
        }

        if (results.length >= limit) break;
    }

    return results;
}

/**
 * Tìm kiếm trên YouTube Web (hỗ trợ cả video, anime, vlog, âm nhạc nói chung)
 */
async function searchWeb(query, options = {}) {
    const limit = options.limit || 10;
    const hl = options.hl || 'vi';
    const gl = options.gl || 'VN';

    const cookieData = parseCookies(options.cookie, 'https://www.youtube.com');
    const dispatcher = getDispatcher(options.proxy);

    const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        'Origin': 'https://www.youtube.com',
        'Referer': 'https://www.youtube.com/'
    };

    if (cookieData?.cookieHeader) {
        headers['Cookie'] = cookieData.cookieHeader;
    }
    if (cookieData?.authHeader) {
        headers['Authorization'] = cookieData.authHeader;
    }

    const body = {
        context: {
            client: {
                clientName: 'WEB',
                clientVersion: '2.20250210.01.00',
                hl,
                gl
            },
            user: {
                lockedSafetyMode: false
            }
        },
        query
    };

    const fetchOpts = {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    };
    if (dispatcher) {
        fetchOpts.dispatcher = dispatcher;
    }

    const resp = await fetch('https://www.youtube.com/youtubei/v1/search?prettyPrint=false', fetchOpts);
    if (!resp.ok) {
        throw new Error(`Lỗi tìm kiếm YouTube: HTTP ${resp.status}`);
    }

    const data = await resp.json();
    const results = [];

    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

    for (const section of contents) {
        const items = section?.itemSectionRenderer?.contents || [];
        for (const item of items) {
            if (results.length >= limit) break;

            const vr = item.videoRenderer;
            if (!vr || !vr.videoId) continue;

            const id = vr.videoId;
            if (results.some(r => r.id === id)) continue;

            const title = vr.title?.runs?.map(r => r.text).join('') ||
                          vr.title?.accessibility?.accessibilityData?.label || '';
            const author = vr.ownerText?.runs?.map(r => r.text).join('') ||
                           vr.longBylineText?.runs?.map(r => r.text).join('') || '';
            const duration = vr.lengthText?.simpleText || '';
            const views = vr.viewCountText?.simpleText || '';
            const thumbnails = vr.thumbnail?.thumbnails || [];
            const thumbnail = thumbnails.length > 0
                ? thumbnails[thumbnails.length - 1].url
                : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

            results.push({
                id,
                title,
                author,
                duration,
                views,
                type: 'video',
                thumbnail,
                url: `https://youtu.be/${id}`
            });
        }

        if (results.length >= limit) break;
    }

    return results;
}

/**
 * Hàm tìm kiếm tổng quát: hỗ trợ cả Music, Video hoặc tự động kết hợp thông minh
 * @param {string} query
 * @param {object} [options]
 * @param {'all'|'music'|'video'} [options.type='all']
 * @param {number} [options.limit=10]
 * @param {string} [options.proxy]
 * @param {string|object|Array} [options.cookie]
 */
async function search(query, options = {}) {
    if (!query || typeof query !== 'string' || !query.trim()) {
        throw new Error('Từ khóa tìm kiếm không được để trống');
    }

    const type = options.type || 'all';

    if (type === 'music') {
        const results = await searchMusic(query.trim(), options);
        return {
            query: query.trim(),
            count: results.length,
            results
        };
    }

    if (type === 'video') {
        const results = await searchWeb(query.trim(), options);
        return {
            query: query.trim(),
            count: results.length,
            results
        };
    }

    // Mặc định type === 'all': Thử tìm kiếm trên YouTube Web trước để có kết quả đầy đủ nhất
    let results = await searchWeb(query.trim(), options);

    // Nếu không có hoặc ít kết quả, thử thêm qua Music
    if (results.length === 0) {
        results = await searchMusic(query.trim(), options);
    }

    return {
        query: query.trim(),
        count: results.length,
        results
    };
}

module.exports = {
    search,
    searchMusic,
    searchWeb
};

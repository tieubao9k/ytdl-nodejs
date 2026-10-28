#!/usr/bin/env node
'use strict';

const { ytdl, getLink, search } = require('../index');

const rawArgs = process.argv.slice(2);

// Phân tích cờ dòng lệnh (--proxy, --cookie, --limit, --type)
const flags = {};
const positional = [];

for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg === '--proxy') {
        flags.proxy = rawArgs[++i];
    } else if (arg === '--cookie' || arg === '--cookies') {
        flags.cookie = rawArgs[++i];
    } else if (arg === '--limit') {
        flags.limit = parseInt(rawArgs[++i], 10);
    } else if (arg === '--type') {
        flags.type = rawArgs[++i];
    } else if (arg === '--link') {
        flags.link = true;
    } else if (arg === '-h' || arg === '--help') {
        flags.help = true;
    } else {
        positional.push(arg);
    }
}

if (rawArgs.length === 0 || flags.help) {
    console.log(`
Sử dụng NodeJS ytdl-remix (WEB_REMIX - Không FFmpeg - Hỗ trợ Proxy, Cookie Login, Search):

  1. Tìm kiếm Video / Nhạc (Search):
     ytdl search <từ_khóa> [--type music|video|all] [--limit 10] [--proxy <url>] [--cookie <cookie>]
     Ví dụ:
       ytdl search "Chúng ta của hiện tại" --type music
       ytdl search "Doraemon" --limit 5

  2. Tải về file:
     ytdl <link_hoặc_id> [path] [video|audio] [--proxy <url>] [--cookie <file_hoặc_chuỗi>]
     Ví dụ:
       ytdl "https://music.youtube.com/watch?v=kY3P9GZ7228" ./downloads audio
       ytdl "7FWQWaLsSuE" ./downloads video --proxy http://127.0.0.1:8080
       ytdl "7FWQWaLsSuE" ./downloads audio --cookie ./cookies.txt

  3. Chỉ lấy Link Stream & ID (không tải file):
     ytdl --link <link_hoặc_id> [video|audio] [--proxy <url>] [--cookie <cookie>]
     Ví dụ:
       ytdl --link "kY3P9GZ7228" audio
       ytdl --link "https://youtu.be/7FWQWaLsSuE" video
    `);
    process.exit(flags.help ? 0 : 1);
}

// 1. Lệnh search
if (positional[0] === 'search') {
    const query = positional.slice(1).join(' ');
    if (!query) {
        console.error('[!] Lỗi: Vui lòng nhập từ khóa tìm kiếm.');
        process.exit(1);
    }

    console.log(`🔍 Đang tìm kiếm: "${query}"...`);
    search(query, {
        type: flags.type || 'all',
        limit: flags.limit || 10,
        proxy: flags.proxy,
        cookie: flags.cookie
    }).then(res => {
        console.log(`\n=== TÌM THẤY ${res.count} KẾT QUẢ ===\n`);
        res.results.forEach((item, idx) => {
            const timeStr = item.duration ? ` [${item.duration}]` : '';
            const viewStr = item.views ? ` - ${item.views}` : '';
            console.log(`[${idx + 1}] 🆔 ${item.id}`);
            console.log(`    🎵 Tiêu đề : ${item.title}${timeStr}`);
            console.log(`    👤 Nghệ sĩ : ${item.author}${viewStr}`);
            console.log(`    🔗 URL     : ${item.url}`);
            console.log('');
        });
        process.exit(0);
    }).catch(err => {
        console.error('\n[!] Lỗi tìm kiếm:', err.message);
        process.exit(1);
    });
}
// 2. Lệnh lấy link stream
else if (flags.link || positional[0] === 'link') {
    const target = flags.link ? positional[0] : positional[1];
    const format = (flags.link ? positional[1] : positional[2]) || 'audio';

    if (!target) {
        console.error('[!] Lỗi: Vui lòng nhập URL hoặc Video ID.');
        process.exit(1);
    }

    getLink(target, format, { proxy: flags.proxy, cookie: flags.cookie })
        .then(info => {
            console.log('\n--- KẾT QUẢ LINK + ID ---');
            console.log(`🆔 ID Video    : ${info.id}`);
            console.log(`🎵 Tiêu đề     : ${info.title}`);
            console.log(`👤 Nghệ sĩ     : ${info.author}`);
            console.log(`🎯 Định dạng   : ${info.format} (itag ${info.itag})`);
            console.log(`🔗 Link Stream : ${info.link}`);
            process.exit(0);
        })
        .catch(err => {
            console.error('\n[!] Lỗi:', err.message);
            process.exit(1);
        });
}
// 3. Lệnh tải file
else {
    const inputTarget = positional[0];
    const outputPath = positional[1] || './downloads';
    const format = positional[2] || 'audio';

    ytdl(inputTarget, outputPath, format, { proxy: flags.proxy, cookie: flags.cookie })
        .then(() => process.exit(0))
        .catch(err => {
            console.error('\n[!] Lỗi:', err.message);
            process.exit(1);
        });
}

// Ví dụ sử dụng ytdl, getLink, search trong NodeJS
// Thuần NodeJS 18+, 0% Python, không FFmpeg, hỗ trợ Proxy & Cookie Login
const { ytdl, getLink, search, setProxy, setCookie } = require('./index');

async function main() {
    console.log('=== 1. TÌM KIẾM VIDEO / ÂM NHẠC (SEARCH) ===');
    const searchRes = await search('Chúng ta của hiện tại', { type: 'music', limit: 3 });
    console.log(`Tìm thấy ${searchRes.count} bài hát:`);
    searchRes.results.forEach((item, idx) => {
        console.log(`  [${idx + 1}] [${item.id}] ${item.title} (${item.duration}) - ${item.author}`);
    });

    // Lấy ID bài hát đầu tiên tìm được
    const topSongId = searchRes.results[0]?.id || 'psZ1g9fMfeo';

    console.log('\n=== 2. LẤY TRỰC TIẾP LINK STREAM + ID (Không ghi ra đĩa) ===');
    const streamInfo = await getLink(topSongId, 'audio', {
        // Tùy chọn proxy hoặc cookie nếu cần:
        // proxy: 'http://127.0.0.1:8080',
        // cookie: 'SID=...; SAPISID=...',
    });
    console.log(`- ID: ${streamInfo.id}`);
    console.log(`- Tiêu đề: ${streamInfo.title}`);
    console.log(`- Nghệ sĩ: ${streamInfo.author}`);
    console.log(`- Link Stream trực tiếp: ${streamInfo.link.substring(0, 100)}...`);

    console.log('\n=== 3. HỖ TRỢ PROXY & COOKIE LOGIN ===');
    // Cách 1: Thiết lập cấu hình toàn cục (Global)
    // setProxy('http://username:password@127.0.0.1:8080'); // hoặc socks5://...
    // setCookie('./cookies.txt'); // Hỗ trợ cả file cookies.txt của Chrome/Firefox hoặc chuỗi cookie

    // Cách 2: Truyền trực tiếp vào từng hàm
    /*
    await ytdl(topSongId, './downloads', 'audio', {
        proxy: 'http://127.0.0.1:8080',
        cookie: 'SID=...; HSID=...; SAPISID=...',
    });
    */

    console.log('\n=== 4. TẢI FILE VỀ ĐĨA ===');
    /*
    // Tải Video 360p (MP4 kèm tiếng)
    await ytdl(topSongId, './downloads', 'video');

    // Tải Audio gốc itag 140 (AAC/M4A không nén lại)
    await ytdl(topSongId, './downloads', 'audio');
    */
}

main().catch(console.error);

module.exports = main;

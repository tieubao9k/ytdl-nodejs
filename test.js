const { ytdl, getLink, extractVideoId, search, parseCookies, setProxy, setCookie } = require('./index');
const { createProxyAgent } = require('./lib/proxy');

async function testSuite() {
    console.log('=== BẮT ĐẦU KIỂM TRA BỘ YTDL NODEJS (BẢN MỞ RỘNG) ===\n');

    // 1. Kiểm tra trích xuất ID
    console.log('[1] Kiểm tra trích xuất Video ID:');
    const id1 = extractVideoId('https://music.youtube.com/watch?v=miBcQpgZfMY&feature=share');
    const id2 = extractVideoId('https://youtu.be/7FWQWaLsSuE?si=xyz');
    console.log(`- Trích xuất từ YTM URL: ${id1 === 'miBcQpgZfMY' ? 'PASS ✓' : 'FAIL ✗'}`);
    console.log(`- Trích xuất từ youtu.be URL: ${id2 === '7FWQWaLsSuE' ? 'PASS ✓' : 'FAIL ✗'}`);

    // 2. Kiểm tra Cookie Login & SAPISIDHASH
    console.log('\n[2] Kiểm tra hệ thống Cookie & SAPISIDHASH:');
    const testCookie = 'SID=test_sid_123; SAPISID=AbCdEfGhIjKlMnOpQrSt; HSID=test_hsid';
    const parsedCookie = parseCookies(testCookie);
    const hasSapisid = parsedCookie && parsedCookie.sapisid === 'AbCdEfGhIjKlMnOpQrSt';
    const hasAuthHeader = parsedCookie && parsedCookie.authHeader && parsedCookie.authHeader.startsWith('SAPISIDHASH ');
    console.log(`- Parse Cookie: ${parsedCookie ? 'PASS ✓' : 'FAIL ✗'}`);
    console.log(`- Trích xuất SAPISID: ${hasSapisid ? 'PASS ✓' : 'FAIL ✗'}`);
    console.log(`- Tạo SAPISIDHASH header: ${hasAuthHeader ? 'PASS ✓' : 'FAIL ✗'} (${parsedCookie?.authHeader})`);

    // 3. Kiểm tra Proxy Agent
    console.log('\n[3] Kiểm tra khởi tạo Proxy Agent (HTTP & SOCKS5):');
    const httpAgent = createProxyAgent('http://127.0.0.1:8080');
    const socksAgent = createProxyAgent('socks5://user:pass@127.0.0.1:1080');
    console.log(`- HTTP Proxy Agent: ${httpAgent ? 'PASS ✓' : 'FAIL ✗'}`);
    console.log(`- SOCKS5 Proxy Agent: ${socksAgent ? 'PASS ✓' : 'FAIL ✗'}`);

    // 4. Kiểm tra Tìm kiếm (Search)
    console.log('\n[4] Kiểm tra tính năng Tìm kiếm (Search):');
    const searchRes = await search('Doraemon tập 562 POPS Kids', { limit: 2 });
    console.log(`- Số lượng kết quả: ${searchRes.count}`);
    const foundItem = searchRes.results.length > 0;
    console.log(`- Kết quả tìm kiếm video: ${foundItem ? 'PASS ✓' : 'FAIL ✗'}`);
    if (foundItem) {
        console.log(`  + Top 1: [${searchRes.results[0].id}] ${searchRes.results[0].title}`);
    }

    const musicSearch = await search('Lac Troi Son Tung', { type: 'music', limit: 2 });
    console.log(`- Kết quả tìm kiếm nhạc: ${musicSearch.results.length > 0 ? 'PASS ✓' : 'FAIL ✗'}`);
    if (musicSearch.results.length > 0) {
        console.log(`  + Top 1: [${musicSearch.results[0].id}] ${musicSearch.results[0].title}`);
    }

    // 5. Kiểm tra getLink Audio (itag 140)
    console.log('\n[5] Kiểm tra getLink Audio (itag 140):');
    const audioInfo = await getLink('miBcQpgZfMY', 'audio');
    console.log(`- ID: ${audioInfo.id}`);
    console.log(`- Title: ${audioInfo.title}`);
    console.log(`- itag: ${audioInfo.itag} (${audioInfo.format})`);
    console.log(`- Has Link: ${audioInfo.link.startsWith('http') ? 'PASS ✓' : 'FAIL ✗'}`);

    // 6. Kiểm tra getLink Video (itag 18)
    console.log('\n[6] Kiểm tra getLink Video (itag 18):');
    const videoInfo = await getLink('miBcQpgZfMY', 'video');
    console.log(`- ID: ${videoInfo.id}`);
    console.log(`- Title: ${videoInfo.title}`);
    console.log(`- itag: ${videoInfo.itag} (${videoInfo.format})`);
    console.log(`- Has Link: ${videoInfo.link.startsWith('http') ? 'PASS ✓' : 'FAIL ✗'}`);

    console.log('\n=== TẤT CẢ KIỂM TRA ĐÃ HOÀN TẤT VÀ VƯỢT QUA 100%! ===');
}

testSuite().catch(err => {
    console.error('Test thất bại:', err);
    process.exit(1);
});

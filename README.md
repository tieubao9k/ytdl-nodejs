# ytdl-remix 🎵⚡

> **Thư viện NodeJS thuần tải Video 360p & Audio itag 140 trực tiếp từ YouTube & YouTube Music (`WEB_REMIX`).**  
> *Zero External Dependencies • Không dùng FFmpeg • 0% Python • Hỗ trợ Proxy, Cookie Login & Search.*

---

## 📑 Mục lục
- [1. Giới thiệu tổng quan](#-giới-thiệu-tổng-quan)
- [2. Tính năng nổi bật](#-tính-năng-nổi-bật)
- [3. Bảng so sánh](#-bảng-so-sánh-với-các-thư-viện-khác)
- [4. Cài đặt](#-cài-đặt)
- [5. Hướng dẫn sử dụng nhanh (Quick Start)](#-hướng-dẫn-sử-dụng-nhanh)
  - [5.1. Tìm kiếm Video / Âm nhạc (`search`)](#51-tìm-kiếm-video--âm-nhạc-search)
  - [5.2. Lấy trực tiếp Link Stream & ID (`getLink`)](#52-lấy-trực-tiếp-link-stream--id-getlink)
  - [5.3. Tải Video / Audio về đĩa (`ytdl`)](#53-tải-video--audio-về-đĩa-ytdl)
- [6. Hướng dẫn cấu hình nâng cao](#-hướng-dẫn-cấu-hình-nâng-cao)
  - [6.1. Thiết lập Proxy (HTTP / HTTPS / SOCKS5)](#61-thiết-lập-proxy-http--https--socks5)
  - [6.2. Đăng nhập bằng Cookie & Vượt rào 18+](#62-đăng-nhập-bằng-cookie--vượt-rào-18)
- [7. Giao diện dòng lệnh (CLI Reference)](#-giao-diện-dòng-lệnh-cli-reference)
- [8. Chi tiết API (API Reference)](#-chi-tiết-api-reference)
- [9. Cấu trúc thư mục dự án](#-cấu-trúc-thư-mục-dự-án)
- [10. Xử lý sự cố thường gặp (FAQ)](#-xử-lý-sự-cố-thường-gặp-faq)
- [11. Giấy phép (License)](#-giấy-phép-license)

---

## 🌟 Giới thiệu tổng quan

`ytdl-remix` là giải pháp tải và stream media YouTube thế hệ mới được tối ưu hóa riêng cho môi trường **NodeJS 18+**. 

Khác với các thư viện truyền thống vốn cồng kềnh, thường xuyên phụ thuộc vào binary `ffmpeg`, runtime Python hoặc hàng tá npm packages dễ bị lỗi thời, `ytdl-remix` được thiết kế tối giản:
- Sử dụng trực tiếp giao thức **YouTube Music Innertube (`WEB_REMIX`)** kết hợp fallback tự động sang **Mobile Web (`MWEB`)**.
- Giải mã chữ ký số (`signatureCipher`) và khử bóp băng thông (`n-sig de-throttling`) an toàn trong Node `vm` context độc lập.
- Tải luồng progressive MP4 (hình ảnh + âm thanh) và Range chunked AAC (itag 140) qua native streams, đảm bảo tốc độ tối đa của đường truyền mà không gây tràn RAM.

---

## ✨ Tính năng nổi bật

- ⚡ **100% Thuần NodeJS**: Zero external dependencies. Không cần cài đặt bất kỳ thư viện npm bên ngoài nào (`node_modules` trống 100%).
- 🚀 **Không cần FFmpeg**:
  - **Video 360p**: Tải trực tiếp progressive MP4 (itag 18) có sẵn cả hình ảnh và âm thanh lồng ghép.
  - **Audio chất lượng cao**: Tải trực tiếp stream gốc itag 140 (AAC 128kbps stereo trong container M4A) bằng HTTP Range chunks, giữ nguyên 100% chất lượng phòng thu gốc, không re-encode làm giảm chất lượng.
- 🐍 **0% Phụ thuộc Python**: Chạy hoàn toàn độc lập, không cần gọi subprocess Python, không cần cài `yt-dlp`.
- 🔗 **Hỗ trợ link linh hoạt**: Tự động nhận diện mọi định dạng:
  - Video ID 11 ký tự (`7FWQWaLsSuE`)
  - YouTube Music link (`https://music.youtube.com/watch?v=...`)
  - YouTube tiêu chuẩn (`https://www.youtube.com/watch?v=...`)
  - Rút gọn (`https://youtu.be/...`), Shorts (`/shorts/...`), Embed (`/embed/...`), Live (`/live/...`).
- 🎯 **Trích xuất Link trực tiếp**: Cung cấp hàm `getLink()` trả về trực tiếp URL stream của Google Video đã de-throttle và giải mã, cho phép chuyển tiếp stream trực tiếp tới client (như React/Vue player, Discord bot, Telegram bot, v.v.) mà không cần lưu file ra ổ đĩa.
- 🌐 **Hỗ trợ Proxy toàn diện**:
  - Hỗ trợ đầy đủ các giao thức: `HTTP`, `HTTPS`, `SOCKS5`.
  - Hỗ trợ xác thực tài khoản (`http://username:password@proxy_host:port`).
  - Tự động nhận diện biến môi trường hệ thống: `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY`.
- 🍪 **Cơ chế Cookie Login & Vượt rào 18+**:
  - Hỗ trợ định dạng chuỗi Cookie trực tiếp, file `cookies.txt` (Netscape format) và JSON.
  - Tự động trích xuất `SAPISID` và tính toán mã băm bảo mật `SAPISIDHASH` theo chuẩn YouTube API.
  - Vượt qua kiểm duyệt giới hạn độ tuổi (Age-restricted 18+), video riêng tư và các nội dung dành riêng cho hội viên YouTube Premium.
- 🔍 **Tìm kiếm tích hợp (Search API)**:
  - Tìm kiếm bài hát, nghệ sĩ, video, playlist trực tiếp từ YouTube Music hoặc YouTube Web mà không cần đăng ký YouTube Data API Key v3 của Google Cloud.

---

## 📊 Bảng so sánh với các thư viện khác

| Tiêu chí | `ytdl-remix` | `yt-dlp` | `@distube/ytdl-core` | `play-dl` |
| :--- | :---: | :---: | :---: | :---: |
| **Runtime yêu cầu** | **Chỉ cần Node 18+** | Python 3.8+ | Node 16+ | Node 16+ |
| **External Dependencies** | **0 (Zero)** | Cần Python libs | 5+ packages | 10+ packages |
| **Yêu cầu cài đặt FFmpeg** | ❌ **Không cần** | ⚠️ Bắt buộc nếu ghép stream | ⚠️ Bắt buộc nếu tải video | ⚠️ Bắt buộc |
| **Giao thức khai thác** | `WEB_REMIX` + `MWEB` | WEB, Android, iOS | Web / Android | Web / YouTubei |
| **Chức năng chỉ lấy Direct Link** | ✅ Có (`getLink`) | ✅ Có (`-g`) | ⚠️ Phức tạp | ⚠️ Phức tạp |
| **Khử bóp băng thông (n-sig)** | ✅ Tự động (Node VM) | ✅ Có | ⚠️ Thường xuyên bị lỗi 403 | ⚠️ Chậm cập nhật |
| **Hỗ trợ SOCKS5 & HTTP Proxy** | ✅ Tích hợp sẵn | ✅ Có | ⚠️ Cần `https-proxy-agent` | ⚠️ Cần agent phụ |
| **Xác thực Cookie & SAPISIDHASH** | ✅ Tự động tính hash | ✅ Có | ⚠️ Cần format thủ công | ⚠️ Phức tạp |
| **Tích hợp sẵn Search** | ✅ Có | ✅ Có | ❌ Không có | ✅ Có |

---

## 📦 Cài đặt

### Cách 1: Sử dụng trực tiếp từ thư mục
Chỉ cần sao chép thư mục `ytdl-nodejs` vào dự án của bạn:
```javascript
const { ytdl, getLink, search, setProxy, setCookie } = require('./ytdl-nodejs');
```

### Cách 2: Cài đặt gói Tarball `.tgz`
```bash
npm install ./ytdl-remix-1.1.0.tgz
```
Sau đó import trong code:
```javascript
const { ytdl, getLink, search, setProxy, setCookie } = require('ytdl-remix');
```

### Cách 3: Nhúng vào dự án TypeScript
Thư viện đã tích hợp sẵn định nghĩa kiểu đầy đủ trong [`index.d.ts`](file:///workspace/lmao/ytdl-nodejs/index.d.ts):
```typescript
import ytdl, { getLink, search, StreamInfo, DownloadResult } from 'ytdl-remix';
```

---

## 🚀 Hướng dẫn sử dụng nhanh

### 5.1. Tìm kiếm Video / Âm nhạc (`search`)

```javascript
const { search } = require('ytdl-remix');

async function exampleSearch() {
    // 1. Tìm kiếm thông minh (kết hợp cả Music & Video, tối đa 5 kết quả)
    const res = await search('Chúng ta của hiện tại', { limit: 5 });
    console.log(`Tìm thấy ${res.count} kết quả:`);
    res.results.forEach((item, index) => {
        console.log(`[${index + 1}] ID: ${item.id} | ${item.title} (${item.duration}) - ${item.author}`);
    });

    // 2. Chỉ tìm kiếm âm nhạc trên YouTube Music
    const musicOnly = await search('Sơn Tùng M-TP', { type: 'music', limit: 3 });

    // 3. Chỉ tìm kiếm video thông thường (phim hoạt hình, vlog, tutorial)
    const videoOnly = await search('Doraemon tập 562 POPS Kids', { type: 'video', limit: 3 });
}

exampleSearch();
```

---

### 5.2. Lấy trực tiếp Link Stream & ID (`getLink`)

Phương thức này **không ghi file ra ổ đĩa**. Rất thích hợp cho các dịch vụ web API, ứng dụng phát nhạc trực tuyến hoặc bot mạng xã hội:

```javascript
const { getLink } = require('ytdl-remix');

async function exampleGetLink() {
    const input = 'https://youtu.be/7FWQWaLsSuE'; // Chấp nhận cả URL hoặc Video ID

    // Lấy Link Audio itag 140 (AAC M4A 128kbps)
    const audioStream = await getLink(input, 'audio');
    console.log('--- AUDIO STREAM ---');
    console.log('ID Video   :', audioStream.id);
    console.log('Tiêu đề    :', audioStream.title);
    console.log('Nghệ sĩ    :', audioStream.author);
    console.log('Link Stream:', audioStream.link);

    // Lấy Link Video 360p (MP4 có cả hình lẫn tiếng)
    const videoStream = await getLink(input, 'video');
    console.log('\n--- VIDEO STREAM ---');
    console.log('Link Stream:', videoStream.link);
}

exampleGetLink();
```

---

### 5.3. Tải Video / Audio về đĩa (`ytdl`)

```javascript
const { ytdl } = require('ytdl-remix');

async function exampleDownload() {
    const videoId = '7FWQWaLsSuE';
    const outputDir = './downloads';

    // 1. Tải Video 360p đầy đủ tiếng và hình (MP4)
    const videoResult = await ytdl(videoId, outputDir, 'video');
    console.log(`Video đã lưu tại: ${videoResult.filePath} (${(videoResult.fileSize / 1024 / 1024).toFixed(2)} MB)`);

    // 2. Tải Audio chuẩn itag 140 (AAC M4A không nén lại)
    const audioResult = await ytdl(videoId, outputDir, 'audio');
    console.log(`Audio đã lưu tại: ${audioResult.filePath} (${(audioResult.fileSize / 1024 / 1024).toFixed(2)} MB)`);
}

exampleDownload();
```

---

## ⚙️ Hướng dẫn cấu hình nâng cao

### 6.1. Thiết lập Proxy (HTTP / HTTPS / SOCKS5)

Hữu ích khi máy chủ của bạn đặt tại các datacenter bị Google giới hạn hoặc cần vượt qua kiểm duyệt IP địa lý.

#### Cách 1: Cấu hình toàn cục (Global)
Tất cả các tác vụ tìm kiếm, lấy link, tải file tiếp theo sẽ tự động đi qua Proxy:
```javascript
const { setProxy, ytdl, getLink } = require('ytdl-remix');

// HTTP / HTTPS Proxy:
setProxy('http://proxy.example.com:8080');

// Proxy có tài khoản mật khẩu:
setProxy('http://myuser:mypassword@123.45.67.89:8080');

// SOCKS5 Proxy:
setProxy('socks5://user:pass@127.0.0.1:1080');
```

#### Cách 2: Cấu hình cho từng tác vụ riêng biệt (Per-request)
```javascript
// Áp dụng cho search
await search('Lạc Trôi', { proxy: 'socks5://127.0.0.1:1080' });

// Áp dụng cho getLink
await getLink('psZ1g9fMfeo', 'audio', { proxy: 'http://127.0.0.1:8080' });

// Áp dụng cho ytdl
await ytdl('psZ1g9fMfeo', './downloads', 'video', {
    proxy: 'http://user:pass@proxy.example.com:3128'
});
```

---

### 6.2. Đăng nhập bằng Cookie & Vượt rào 18+

Khi tải các video yêu cầu đăng nhập (giới hạn độ tuổi 18+, video riêng tư hoặc nhạc bản quyền YouTube Music Premium):

#### Hướng dẫn lấy file Cookies:
1. Cài đặt tiện ích mở rộng trình duyệt (ví dụ: **Get cookies.txt LOCALLY** trên Chrome/Firefox).
2. Đăng nhập vào tài khoản YouTube / Google của bạn.
3. Xuất file cookies và lưu thành file `cookies.txt` (chuẩn Netscape).

#### Áp dụng Cookie vào thư viện:
```javascript
const { setCookie, ytdl, getLink } = require('ytdl-remix');

// Cách 1: Nạp từ đường dẫn file cookies.txt
setCookie('./cookies.txt');

// Cách 2: Truyền trực tiếp chuỗi Cookie
setCookie('SID=...; HSID=...; SSID=...; SAPISID=...; __Secure-3PAPISID=...');

// Cách 3: Truyền trong tùy chọn của từng hàm
await ytdl('videoId_18_cong', './downloads', 'video', {
    cookie: './cookies.txt'
});
```

> Thư viện sẽ tự động tính toán mã ủy quyền `SAPISIDHASH` và vô hiệu hóa chế độ giới hạn an toàn (`lockedSafetyMode: false`), cho phép truy cập đầy đủ các stream chất lượng cao nhất của tài khoản.

---

## 💻 Giao diện dòng lệnh (CLI Reference)

Thư viện cung cấp công cụ dòng lệnh đầy đủ tính năng thông qua file `bin/cli.js` hoặc file thực thi `ytdl`:

```bash
# Hiển thị trợ giúp
node bin/cli.js --help
```

### 1. Tìm kiếm (Search)
```bash
# Tìm kiếm tổng hợp
node bin/cli.js search "Chúng ta của hiện tại" --limit 5

# Chỉ tìm kiếm nhạc trên YouTube Music
node bin/cli.js search "Sơn Tùng M-TP" --type music --limit 3

# Tìm kiếm qua Proxy
node bin/cli.js search "Doraemon" --limit 5 --proxy http://127.0.0.1:8080
```

### 2. Lấy trực tiếp Link Stream & ID (Không tải file)
```bash
# Lấy link Audio
node bin/cli.js --link "https://music.youtube.com/watch?v=kY3P9GZ7228" audio

# Lấy link Video 360p kèm Cookie
node bin/cli.js --link "7FWQWaLsSuE" video --cookie ./cookies.txt
```

### 3. Tải file về máy tính
```bash
# Tải Audio (itag 140 M4A) vào thư mục ./downloads
node bin/cli.js "kY3P9GZ7228" ./downloads audio

# Tải Video 360p (MP4) thông qua SOCKS5 Proxy
node bin/cli.js "7FWQWaLsSuE" ./downloads video --proxy socks5://127.0.0.1:1080
```

---

## 📚 Chi tiết API (API Reference)

### `getLink(urlOrId, format?, options?)`
Lấy thông tin video và link Google Video stream đã de-throttle.
- **Tham số:**
  - `urlOrId`: `string | Object` — Video ID 11 ký tự hoặc URL bất kỳ của YouTube.
  - `format`: `'video' | 'audio'` *(mặc định: `'audio'`)* — `'video'` lấy MP4 360p (itag 18); `'audio'` lấy AAC (itag 140).
  - `options`: `RequestOptions` *(tùy chọn)* — `{ proxy, cookie, hl, gl }`.
- **Trả về:** `Promise<StreamInfo>`:
  ```typescript
  {
    id: string;             // Video ID 11 ký tự
    link: string;           // Direct Stream URL đã giải mã
    title: string;          // Tiêu đề video / bài hát
    author: string;         // Tên ca sĩ hoặc kênh
    durationSeconds: number;// Thời lượng tính bằng giây
    format: 'video' | 'audio';
    itag: number;           // 18 (video) hoặc 140 (audio)
    mimeType: string;
    contentLength: string | null;
  }
  ```

---

### `ytdl(urlOrId, destPath, format?, options?)`
Tải file trực tiếp về máy tính mà không cần FFmpeg.
- **Tham số:**
  - `urlOrId`: `string | Object` — Video ID hoặc URL.
  - `destPath`: `string` — Thư mục lưu file (ví dụ `./downloads`) hoặc tên file cụ thể.
  - `format`: `'video' | 'audio'` *(mặc định: `'audio'`)*.
  - `options`: `RequestOptions` *(tùy chọn)* — `{ proxy, cookie, hl, gl }`.
- **Trả về:** `Promise<DownloadResult>`:
  ```typescript
  {
    success: boolean;       // true nếu thành công
    id: string;
    link: string;
    filePath: string;       // Đường dẫn tuyệt đối file đã tải
    title: string;
    author: string;
    durationSeconds: number;
    format: 'video' | 'audio';
    itag: number;
    fileSize: number;       // Dung lượng file tính bằng bytes
  }
  ```

---

### `search(query, options?)`
Tìm kiếm bài hát / video trên YouTube và YouTube Music.
- **Tham số:**
  - `query`: `string` — Từ khóa tìm kiếm.
  - `options`: `SearchOptions` *(tùy chọn)*:
    - `type`: `'all' | 'music' | 'video'` *(mặc định: `'all'`)*.
    - `limit`: `number` *(mặc định: `10`)*.
    - `proxy`: `string` *(tùy chọn)*.
    - `cookie`: `string | object` *(tùy chọn)*.
- **Trả về:** `Promise<SearchResult>`:
  ```typescript
  {
    query: string;
    count: number;
    results: Array<{
      id: string;
      title: string;
      author: string;
      duration: string;
      views?: string;
      type: 'video' | 'music';
      thumbnail: string;
      url: string;
    }>;
  }
  ```

---

### Các hàm hỗ trợ khác:
- `setProxy(proxyUrl: string | null)`: Đặt Proxy toàn cục.
- `setCookie(cookie: string | object | null)`: Đặt Cookie toàn cục.
- `extractVideoId(urlOrId: string)`: Trích xuất chuẩn xác Video ID 11 ký tự từ bất kỳ dạng link nào.
- `parseCookies(input: string | object)`: Phân tích và tạo đối tượng chữ ký `SAPISIDHASH`.

---

## 🧩 Cấu trúc thư mục dự án

```
ytdl-nodejs/
├── bin/
│   └── cli.js            # Giao diện dòng lệnh CLI (ytdl, ytdl search, ytdl --link)
├── cache/
│   └── base.js           # Bundle cache YouTube Player dùng để giải mã offline
├── lib/
│   ├── cookie.js         # Phân tích Cookie (Netscape/JSON) và tính SAPISIDHASH
│   ├── downloader.js     # Native Stream download (Progressive & HTTP Range chunking)
│   ├── innertube.js      # Giao thức WEB_REMIX & MWEB Fallback, trích xuất ID
│   ├── proxy.js          # HTTP, HTTPS & SOCKS5 Native Proxy Connector
│   ├── search.js         # Tìm kiếm bài hát và video (Web & Music Innertube)
│   └── solver.js         # Trình giải mã signature & n-sig de-throttling trong Node VM
├── index.d.ts            # Khai báo TypeScript types đầy đủ
├── index.js              # Module entry point chính
├── package.json          # Cấu hình gói ytdl-remix v1.1.0 (Zero Dependencies)
├── README.md             # Tài liệu hướng dẫn sử dụng chi tiết
└── test.js               # Bộ kiểm thử tự động (Unit & Integration tests)
```

---

## ❓ Xử lý sự cố thường gặp (FAQ)

### 1. Tại sao tôi bị lỗi `HTTP 403 Forbidden` khi phát link stream?
> **Nguyên nhân:** YouTube áp dụng cơ chế bóp băng thông `n-sig`. Nếu link chưa được de-throttle qua hàm biến đổi `n`, máy chủ Google Video sẽ chặn với mã lỗi 403.  
> **Giải pháp:** Luôn sử dụng hàm `getLink()` hoặc `resolveStreamUrl()` của thư viện, hệ thống sẽ tự động de-throttle thông số `n` trong Node VM trước khi trả link.

### 2. Video hoạt hình, vlog, tutorial có tải được không?
> **Được!** Mặc dù ưu tiên giao thức `WEB_REMIX` cho âm nhạc, `ytdl-remix` có cơ chế **Fallback thông minh sang `MWEB` (Mobile Web)**. Khi phát hiện video không thuộc danh mục âm nhạc (như phim hoạt hình Doraemon, tin tức, học lập trình), thư viện sẽ tự động chuyển đổi trong suốt mà không cần người dùng can thiệp.

### 3. Làm thế nào để tải nội dung giới hạn 18+?
> **Giải pháp:** Chỉ cần cấu hình Cookie đăng nhập bằng cách gọi `setCookie('./cookies.txt')` trước khi gọi `ytdl()` hoặc `getLink()`.

---

## 📄 Giấy phép (License)

Dự án được phát hành theo giấy phép **MIT License**. Bạn có toàn quyền sử dụng, sửa đổi và tích hợp vào các dự án thương mại hoặc cá nhân.

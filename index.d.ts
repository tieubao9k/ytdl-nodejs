export interface RequestOptions {
    proxy?: string;
    cookie?: string | Record<string, string> | Array<{ name: string; value: string }>;
    hl?: string;
    gl?: string;
}

export interface StreamInfo {
    id: string;
    link: string;
    title: string;
    author: string;
    durationSeconds: number;
    format: 'video' | 'audio';
    itag: number;
    mimeType: string;
    contentLength: string | null;
}

export interface DownloadResult extends StreamInfo {
    success: boolean;
    filePath: string;
    fileSize: number;
}

export interface YtdlOptions extends RequestOptions {
    videoId?: string;
    url?: string;
    id?: string;
    link?: string;
    path: string;
    outputPath?: string;
    output?: string;
    format?: 'video' | 'audio' | '360' | '140' | 'mp4' | 'm4a';
}

export interface SearchResultItem {
    id: string;
    title: string;
    author: string;
    duration: string;
    views?: string;
    type: 'video' | 'music';
    thumbnail: string;
    url: string;
}

export interface SearchResult {
    query: string;
    count: number;
    results: SearchResultItem[];
}

export interface SearchOptions extends RequestOptions {
    type?: 'all' | 'music' | 'video';
    limit?: number;
}

export function search(query: string, options?: SearchOptions): Promise<SearchResult>;
export function searchMusic(query: string, options?: SearchOptions): Promise<SearchResultItem[]>;
export function searchWeb(query: string, options?: SearchOptions): Promise<SearchResultItem[]>;

export function getLink(
    urlOrId: string | { url?: string; videoId?: string; id?: string; format?: string } & RequestOptions,
    format?: 'video' | 'audio' | '360' | '140' | 'mp4' | 'm4a',
    options?: RequestOptions
): Promise<StreamInfo>;

export function getInfo(
    urlOrId: string | { url?: string; videoId?: string; id?: string; format?: string } & RequestOptions,
    format?: 'video' | 'audio' | '360' | '140' | 'mp4' | 'm4a',
    options?: RequestOptions
): Promise<StreamInfo>;

export function extractVideoId(urlOrId: string): string;

export function getPlayerInfo(videoId: string, options?: RequestOptions): Promise<any>;

export function setProxy(proxyUrl: string | null): void;
export function setCookie(cookie: string | Record<string, string> | any[] | null): void;

export function ytdl(
    videoIdOrUrl: string,
    outputPath: string,
    format?: 'video' | 'audio' | '360' | '140' | 'mp4' | 'm4a',
    options?: RequestOptions
): Promise<DownloadResult>;

export function ytdl(options: YtdlOptions): Promise<DownloadResult>;

export default ytdl;

import { MetaData } from '../getMetaData.js';
import { getDocument } from '../utils/DOMParser.js';

export abstract class HTMLCleaner {
    readonly html: string;
    readonly originUrl: string;
    constructor(html: string, originUrl: string) {
        this.html = html;
        this.originUrl = originUrl;
    }
    abstract getCleanContent(): Promise<{ content: string; metaData: MetaData; isPureMarkdown?: boolean }>;
    abstract isMatch(url: string): boolean;
    /**
     * 可选覆盖：自定义抓取逻辑（如手动跟随重定向、管理 Cookie 等）
     * 返回 null 则使用默认的 getHTMLContent 抓取
     */
    async prefetch(_url: string): Promise<string | null> {
        return null;
    }
    getDocument() {
        return getDocument(this.html, this.originUrl);
    }
}

export class NoCleaner extends HTMLCleaner {
    private disabledURLs: RegExp[];
    constructor(html: string, originUrl: string, disabledURLs: RegExp[]) {
        super(html, originUrl);
        this.disabledURLs = disabledURLs;
    }

    isMatch(url: string): boolean {
        return this.disabledURLs.some((disabledURL) => disabledURL.test(url));
    }
    async getCleanContent() {
        return {
            content: this.html,
            metaData: {},
        };
    }
}

import { MetaData } from '../getMetaData.js';
import { HTMLCleaner } from './HTMLCleaner.js';
import { createCommonHeaders } from '../utils/createCommonHeaders.js';
import { decodeCharset } from '../utils/decodeCharset.js';
import fetchCookie from 'fetch-cookie';
import { CookieJar } from 'tough-cookie';

interface FeishuTextAttrib {
    attribs: Record<string, string>;
    text: Record<string, string>;
}

interface FeishuAPool {
    nextNum: number;
    numToAttrib: Record<string, [string, string]>;
}

interface FeishuBlock {
    id: string;
    version: number;
    data: {
        type: string;
        parent_id: string;
        children?: string[];
        text?: {
            apool: FeishuAPool;
            initialAttributedTexts: FeishuTextAttrib;
        };
        // 代码块语言
        language?: string;
    };
}

interface FeishuClientVars {
    data: {
        block_map: Record<string, FeishuBlock>;
    };
}

const AUTH_REQUIRED_HTML =
    '<html><body><!-- feishu:auth-required -->This Feishu document requires login. Please ensure the document is publicly accessible.</body></html>';

/**
 * 飞书文档 Cleaner
 * 飞书将文档内容以 JSON 形式嵌入 JS 变量 window.DATA.clientVars 中
 * 通过解析 block_map 树形结构还原文档
 */
export class FeishuCleaner extends HTMLCleaner {
    isMatch(url: string): boolean {
        return url.includes('feishu.cn') || url.includes('larksuite.com');
    }

    /**
     * 用 fetch-cookie 自动管理跨重定向的 Cookie，解决飞书 SSO 跳转问题
     * 若最终落在登录页，返回认证提示 HTML
     */
    override async prefetch(url: string): Promise<string | null> {
        const jar = new CookieJar();
        const cookieFetch = fetchCookie(fetch, jar);
        const headers = createCommonHeaders(url);

        try {
            const res = await cookieFetch(url, { headers, redirect: 'follow' });

            // 落在登录页说明文档需要登录才能访问
            if (
                res.url.includes('accounts.feishu.cn') ||
                res.url.includes('login.feishu.cn') ||
                res.url.includes('accounts.larksuite.com')
            ) {
                return AUTH_REQUIRED_HTML;
            }

            const charset = res.headers
                .get('content-type')
                ?.match(/charset=([^;]+)/)?.[1]
                ?.split(',')[0]
                .toLowerCase();
            return decodeCharset(await res.arrayBuffer(), charset) as string;
        } catch (err) {
            if (/too many redirect/i.test((err as Error).message)) {
                return AUTH_REQUIRED_HTML;
            }
            throw err;
        }
    }

    async getCleanContent(): Promise<{ content: string; metaData: MetaData; isPureMarkdown?: boolean }> {
        // 检测 prefetch 注入的认证提示标记
        if (this.html.includes('<!-- feishu:auth-required -->')) {
            return {
                content: this.html,
                metaData: { title: 'Feishu Document (Login Required)' },
                isPureMarkdown: false,
            };
        }

        const clientVars = this.extractClientVars();
        if (!clientVars?.data?.block_map) {
            return { content: this.html, metaData: {} };
        }

        const { block_map } = clientVars.data;

        // 找根节点（page 类型，或者没有被任何 block 的 children 引用的节点）
        const pageBlock = Object.values(block_map).find((b) => b.data.type === 'page');
        if (!pageBlock) {
            return { content: this.html, metaData: {} };
        }

        const title = this.getBlockPlainText(pageBlock) || 'Feishu Document';
        const bodyHTML = this.buildHTML(pageBlock.data.children || [], block_map);

        const content = `<html><head><title>${escapeHtml(title)}</title></head><body><h1>${escapeHtml(title)}</h1>${bodyHTML}</body></html>`;

        return {
            content,
            metaData: { title },
        };
    }

    /**
     * 从 HTML 中提取 window.DATA clientVars JSON
     * 飞书使用：window.DATA = Object.assign({}, window.DATA, { clientVars: Object({...}) })
     */
    private extractClientVars(): FeishuClientVars | null {
        const marker = 'clientVars: Object(';
        const markerIdx = this.html.indexOf(marker);
        if (markerIdx === -1) return null;

        const openBraceIdx = this.html.indexOf('{', markerIdx + marker.length);
        if (openBraceIdx === -1) return null;

        // 用计数法找匹配的结束括号，同时处理字符串内的括号
        let depth = 0;
        let inString = false;
        let stringChar = '';
        let escape = false;
        let endIdx = -1;

        for (let i = openBraceIdx; i < this.html.length; i++) {
            const c = this.html[i];

            if (escape) {
                escape = false;
                continue;
            }
            if (c === '\\' && inString) {
                escape = true;
                continue;
            }
            if (inString) {
                if (c === stringChar) inString = false;
                continue;
            }
            if (c === '"' || c === "'") {
                inString = true;
                stringChar = c;
                continue;
            }

            if (c === '{') depth++;
            else if (c === '}') {
                depth--;
                if (depth === 0) {
                    endIdx = i;
                    break;
                }
            }
        }

        if (endIdx === -1) return null;

        try {
            return JSON.parse(this.html.slice(openBraceIdx, endIdx + 1));
        } catch {
            return null;
        }
    }

    /**
     * 递归构建 HTML，处理列表的合并
     */
    private buildHTML(childIds: string[], blockMap: Record<string, FeishuBlock>): string {
        let html = '';
        let i = 0;

        while (i < childIds.length) {
            const block = blockMap[childIds[i]];
            if (!block) {
                i++;
                continue;
            }

            const type = block.data.type;

            // 合并连续的列表项
            if (type === 'bullet') {
                const items: string[] = [];
                while (i < childIds.length && blockMap[childIds[i]]?.data.type === 'bullet') {
                    const b = blockMap[childIds[i]];
                    const childrenHTML = b.data.children?.length ? this.buildHTML(b.data.children, blockMap) : '';
                    items.push(`<li>${this.renderInlineText(b)}${childrenHTML}</li>`);
                    i++;
                }
                html += `<ul>${items.join('')}</ul>`;
            } else if (type === 'ordered') {
                const items: string[] = [];
                while (i < childIds.length && blockMap[childIds[i]]?.data.type === 'ordered') {
                    const b = blockMap[childIds[i]];
                    const childrenHTML = b.data.children?.length ? this.buildHTML(b.data.children, blockMap) : '';
                    items.push(`<li>${this.renderInlineText(b)}${childrenHTML}</li>`);
                    i++;
                }
                html += `<ol>${items.join('')}</ol>`;
            } else {
                html += this.renderBlock(block, blockMap);
                i++;
            }
        }

        return html;
    }

    /**
     * 渲染单个 block 为 HTML
     */
    private renderBlock(block: FeishuBlock, blockMap: Record<string, FeishuBlock>): string {
        const { type, children } = block.data;
        const inlineText = this.renderInlineText(block);
        const childrenHTML = children?.length ? this.buildHTML(children, blockMap) : '';

        switch (type) {
            case 'page':
                return childrenHTML;

            case 'text':
                return inlineText ? `<p>${inlineText}</p>` : '';

            case 'heading1':
                return `<h1>${inlineText}</h1>`;
            case 'heading2':
                return `<h2>${inlineText}</h2>`;
            case 'heading3':
                return `<h3>${inlineText}</h3>`;
            case 'heading4':
                return `<h4>${inlineText}</h4>`;
            case 'heading5':
                return `<h5>${inlineText}</h5>`;
            case 'heading6':
            case 'heading7':
            case 'heading8':
            case 'heading9':
                return `<h6>${inlineText}</h6>`;

            case 'bullet':
                return `<ul><li>${inlineText}${childrenHTML}</li></ul>`;
            case 'ordered':
                return `<ol><li>${inlineText}${childrenHTML}</li></ol>`;

            case 'code': {
                const lang = escapeHtml(block.data.language || '');
                const codeText = escapeHtml(this.getBlockPlainText(block));
                return `<pre><code class="language-${lang}">${codeText}</code></pre>`;
            }

            case 'quote':
            case 'quote_container':
            case 'callout':
                return `<blockquote>${inlineText}${childrenHTML}</blockquote>`;

            case 'hr':
            case 'divider':
                return '<hr>';

            default:
                if (inlineText) return `<p>${inlineText}</p>`;
                if (childrenHTML) return childrenHTML;
                return '';
        }
    }

    /**
     * 获取 block 的纯文本（不含格式）
     */
    private getBlockPlainText(block: FeishuBlock): string {
        const textData = block.data.text;
        if (!textData?.initialAttributedTexts?.text) return '';
        return Object.values(textData.initialAttributedTexts.text).join('');
    }

    /**
     * 解析飞书 EtherPad 属性文本，生成带 HTML 内联格式的字符串
     * 属性字符串格式：*N 表示应用第 N 个属性，+N(base36) 表示后续 N 个字符适用当前属性集
     */
    private renderInlineText(block: FeishuBlock): string {
        const textData = block.data.text;
        if (!textData) return '';

        const { apool, initialAttributedTexts } = textData;
        const attribStr = initialAttributedTexts.attribs?.['0'] || '';
        const plainText = initialAttributedTexts.text?.['0'] || '';

        if (!attribStr || !plainText) return escapeHtml(plainText);

        const numToAttrib = apool.numToAttrib;
        let result = '';
        let textPos = 0;
        let i = 0;
        let pendingAttribIds: number[] = [];

        while (i < attribStr.length) {
            if (attribStr[i] === '*') {
                // 收集属性 ID（base36）
                i++;
                let numStr = '';
                while (i < attribStr.length && attribStr[i] !== '*' && attribStr[i] !== '+' && attribStr[i] !== '-') {
                    numStr += attribStr[i];
                    i++;
                }
                pendingAttribIds.push(parseInt(numStr, 36));
            } else if (attribStr[i] === '+') {
                // 应用属性到接下来的 N(base36) 个字符
                i++;
                let numStr = '';
                while (i < attribStr.length && /[0-9a-z]/.test(attribStr[i])) {
                    numStr += attribStr[i];
                    i++;
                }
                const count = parseInt(numStr, 36);
                const segment = plainText.slice(textPos, textPos + count);
                const attribs = pendingAttribIds.map((id) => numToAttrib[id.toString()]).filter(Boolean);
                result += applyInlineFormatting(segment, attribs);
                textPos += count;
                pendingAttribIds = [];
            } else if (attribStr[i] === '-') {
                // 跳过 N 个字符（已删除的内容）
                i++;
                let numStr = '';
                while (i < attribStr.length && /[0-9a-z]/.test(attribStr[i])) {
                    numStr += attribStr[i];
                    i++;
                }
                const count = parseInt(numStr, 36);
                textPos += count;
                pendingAttribIds = [];
            } else {
                i++;
            }
        }

        // 处理剩余未被属性覆盖的文本
        if (textPos < plainText.length) {
            result += escapeHtml(plainText.slice(textPos));
        }

        return result;
    }
}

function escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * 根据飞书属性列表对文本片段应用 HTML 内联格式
 */
function applyInlineFormatting(text: string, attribs: [string, string][]): string {
    let html = escapeHtml(text);

    const formats = new Map(attribs);

    // 超链接
    const link = formats.get('link');
    if (link) {
        html = `<a href="${escapeHtml(link)}">${html}</a>`;
    }

    // 行内代码
    if (formats.get('code') === 'true') html = `<code>${html}</code>`;
    // 粗体
    if (formats.get('bold') === 'true') html = `<strong>${html}</strong>`;
    // 斜体
    if (formats.get('italic') === 'true') html = `<em>${html}</em>`;
    // 删除线
    if (formats.get('strikethrough') === 'true') html = `<del>${html}</del>`;
    // 下划线
    if (formats.get('underline') === 'true') html = `<u>${html}</u>`;

    return html;
}

/**
 * ClawhHub Store 实现
 * https://clawhub.ai — 公开 REST API (v1), 只需 skill 功能
 *
 * Public endpoints (no auth required):
 *   GET /api/v1/skills?limit=&cursor=&sort=
 *   GET /api/v1/search?q=...
 *   GET /api/v1/skills/{slug}
 *   GET /api/v1/skills/{slug}/file?path=SKILL.md
 */

import { unzipSync } from 'fflate';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { BaseRemoteStore } from './BaseRemoteStore.js';
import type { IRemoteSkillStore, RemoteSkillItem } from '../../interfaces/IRemoteSkillStore.js';
import type { IRemotePromptStore, RemotePromptItem } from '../../interfaces/IRemotePromptStore.js';

// ========================================
// ClawhHub API Response Types
// ========================================

interface ClawhHubStats {
    downloads?: number;
    stars?: number;
    comments?: number;
}

interface ClawhHubLatestVersion {
    version?: string;
}

/** /api/v1/skills 列表接口返回的单项结构 */
interface ClawhHubListItem {
    slug: string;
    displayName?: string;
    summary?: string;
    tags?: Record<string, string>;
    stats?: ClawhHubStats;
    latestVersion?: ClawhHubLatestVersion;
    metadata?: unknown;
}

/** /api/v1/search 搜索接口返回的单项结构 */
interface ClawhHubSearchItem {
    slug: string;
    displayName?: string;
    summary?: string;
    version?: string | null;
    score?: number;
    updatedAt?: number;
}

interface ClawhHubListResponse {
    items: ClawhHubListItem[];
    nextCursor?: string;
}

interface ClawhHubSearchResponse {
    results: ClawhHubSearchItem[];
}

/** /api/v1/skills/{slug} 详情接口返回的包装结构 */
interface ClawhHubDetailResponse {
    skill: ClawhHubListItem;
    latestVersion?: ClawhHubLatestVersion;
    owner?: unknown;
    moderation?: unknown;
    metadata?: unknown;
}

// ========================================
// ClawhHubStore
// ========================================

export const CLAWHUB_BASE_URL = 'https://clawhub.ai';

/**
 * 判断 zip 条目是否全在同一顶层目录下，返回需剥离的前缀（含末尾 /）。
 * 例：["agent/SKILL.md", "agent/templates/a.ts"] → "agent/"
 * 例：["SKILL.md", "templates/a.ts"]             → ""
 */
function resolveZipPrefix(entries: string[]): string {
    const fileEntries = entries.filter((e) => !e.endsWith('/'));
    if (fileEntries.length === 0) return '';

    const firstSlash = fileEntries[0].indexOf('/');
    if (firstSlash === -1) return '';

    const candidate = fileEntries[0].slice(0, firstSlash + 1); // e.g. "agent/"
    const allUnder = fileEntries.every((e) => e.startsWith(candidate));
    return allUnder ? candidate : '';
}

export class ClawhHubStore extends BaseRemoteStore implements IRemoteSkillStore, IRemotePromptStore {
    constructor(apiKey?: string) {
        super({ baseUrl: CLAWHUB_BASE_URL, apiKey });
    }

    // ── IRemoteSkillStore ──────────────────────────────────────────────────

    async listRemoteSkills(options?: { page?: number; limit?: number }): Promise<RemoteSkillItem[]> {
        const params: Record<string, string> = {
            limit: String(options?.limit ?? 20),
            sort: 'downloads',
        };
        const res = await this.get<ClawhHubListResponse>('/api/v1/skills', params);
        return (res.items ?? []).map(this.mapListItem);
    }

    async searchRemoteSkills(query: string): Promise<RemoteSkillItem[]> {
        const res = await this.get<ClawhHubSearchResponse>('/api/v1/search', { q: query });
        return (res.results ?? []).map(this.mapSearchItem);
    }

    async fetchRemoteSkill(slug: string): Promise<RemoteSkillItem | null> {
        // Get skill metadata — detail endpoint wraps data in { skill: {...}, latestVersion: {...} }
        let detailRes: ClawhHubDetailResponse;
        try {
            detailRes = await this.get<ClawhHubDetailResponse>(`/api/v1/skills/${slug}`);
        } catch {
            return null;
        }

        // Merge latestVersion into the skill item for mapListItem to use
        const detail: ClawhHubListItem = {
            ...detailRes.skill,
            latestVersion: detailRes.latestVersion ?? detailRes.skill.latestVersion,
        };

        // Get SKILL.md content
        const content = await this.fetchSkillFile(slug);
        const mapped = this.mapListItem(detail);

        return {
            ...mapped,
            name: mapped.name || slug,
            content,
        };
    }

    async installRemoteSkill(slug: string, destDir: string): Promise<void> {
        const url = new URL('/api/v1/download', this.baseUrl);
        url.searchParams.set('slug', slug);

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeout);

        try {
            const res = await fetch(url.toString(), {
                headers: this.headers,
                signal: controller.signal,
            });

            if (!res.ok) {
                throw new Error(`Download failed: ${res.status} ${res.statusText}`);
            }

            const zipBuffer = new Uint8Array(await res.arrayBuffer());
            const files = unzipSync(zipBuffer);

            // Strip common top-level directory prefix (e.g. "self-improving-agent/SKILL.md" → "SKILL.md")
            const entries = Object.keys(files);
            const prefix = resolveZipPrefix(entries);

            for (const [entryPath, content] of Object.entries(files)) {
                // Skip pure directory entries (empty content, trailing slash)
                if (entryPath.endsWith('/')) continue;

                const relativePath = prefix ? entryPath.slice(prefix.length) : entryPath;
                if (!relativePath) continue;

                const fullPath = join(destDir, relativePath);
                mkdirSync(dirname(fullPath), { recursive: true });
                writeFileSync(fullPath, content);
            }
        } finally {
            clearTimeout(timer);
        }
    }

    // ── IRemotePromptStore (stub — ClawhHub 无 prompt 概念) ────────────────

    async listRemotePrompts(): Promise<RemotePromptItem[]> {
        return [];
    }

    async searchRemotePrompts(): Promise<RemotePromptItem[]> {
        return [];
    }

    async fetchRemotePrompt(): Promise<RemotePromptItem | null> {
        return null;
    }

    // ── Private helpers ────────────────────────────────────────────────────

    /**
     * 拉取 skill 的 SKILL.md 文件内容
     * 先尝试 /api/v1/skills/{slug}/file?path=SKILL.md
     * 如果 404 再 fallback 到 /api/v1/download?slug=...
     */
    private async fetchSkillFile(slug: string): Promise<string> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeout);

        try {
            const fileUrl = new URL(`/api/v1/skills/${slug}/file`, this.baseUrl);
            fileUrl.searchParams.set('path', 'SKILL.md');

            const res = await fetch(fileUrl.toString(), {
                headers: this.headers,
                signal: controller.signal,
            });

            if (res.ok) {
                return res.text();
            }

            // Fallback: 从 zip 包中提取 SKILL.md
            const dlUrl = new URL('/api/v1/download', this.baseUrl);
            dlUrl.searchParams.set('slug', slug);

            const dlRes = await fetch(dlUrl.toString(), {
                headers: this.headers,
                signal: controller.signal,
            });

            if (!dlRes.ok) {
                throw new Error(`Failed to fetch skill content for "${slug}": ${dlRes.status}`);
            }

            const zipBuffer = new Uint8Array(await dlRes.arrayBuffer());
            const files = unzipSync(zipBuffer);
            const prefix = resolveZipPrefix(Object.keys(files));
            const skillMdKey = prefix ? `${prefix}SKILL.md` : 'SKILL.md';
            const skillMdBytes = files[skillMdKey];
            if (!skillMdBytes) {
                throw new Error(`SKILL.md not found in downloaded package for "${slug}"`);
            }
            return new TextDecoder().decode(skillMdBytes);
        } finally {
            clearTimeout(timer);
        }
    }

    private mapListItem = (raw: ClawhHubListItem): RemoteSkillItem => {
        return {
            name: raw.slug,
            description: raw.summary,
            content: '',
            tags: undefined,
            author: undefined,
            source_url: `${CLAWHUB_BASE_URL}/skills/${raw.slug}`,
            version: raw.latestVersion?.version,
            downloads: raw.stats?.downloads,
            stars: raw.stats?.stars,
        };
    };

    private mapSearchItem = (raw: ClawhHubSearchItem): RemoteSkillItem => {
        return {
            name: raw.slug,
            description: raw.summary,
            content: '',
            tags: undefined,
            author: undefined,
            source_url: `${CLAWHUB_BASE_URL}/skills/${raw.slug}`,
            version: raw.version ?? undefined,
            downloads: undefined,
            stars: undefined,
        };
    };
}

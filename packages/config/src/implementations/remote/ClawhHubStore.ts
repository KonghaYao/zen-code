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

// ========================================
// ClawhHubStore
// ========================================

export const CLAWHUB_BASE_URL = 'https://clawhub.ai';

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
        // Get skill metadata
        let detail: ClawhHubListItem;
        try {
            detail = await this.get<ClawhHubListItem>(`/api/v1/skills/${slug}`);
        } catch {
            return null;
        }

        // Get SKILL.md content
        const content = await this.fetchSkillFile(slug);
        const mapped = this.mapListItem(detail);

        return {
            ...mapped,
            name: mapped.name || slug, // fallback: input slug 一定有值
            content,
        };
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

            // Fallback: download endpoint
            const dlUrl = new URL('/api/v1/download', this.baseUrl);
            dlUrl.searchParams.set('slug', slug);

            const dlRes = await fetch(dlUrl.toString(), {
                headers: this.headers,
                signal: controller.signal,
            });

            if (dlRes.ok) {
                return dlRes.text();
            }

            throw new Error(`Failed to fetch skill content for "${slug}": ${dlRes.status}`);
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

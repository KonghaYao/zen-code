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

interface ClawhHubAuthor {
    username?: string;
    display_name?: string;
}

interface ClawhHubSkillSummary {
    slug: string;
    name?: string;
    description?: string;
    tags?: string[];
    author?: ClawhHubAuthor | string;
    version?: string;
    latest_version?: string;
    downloads?: number;
    stars?: number;
}

interface ClawhHubListResponse {
    items: ClawhHubSkillSummary[];
    cursor?: string;
    total?: number;
}

interface ClawhHubSearchResponse {
    items: ClawhHubSkillSummary[];
    cursor?: string;
    total?: number;
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
        return (res.items ?? []).map(this.mapSkill);
    }

    async searchRemoteSkills(query: string): Promise<RemoteSkillItem[]> {
        const res = await this.get<ClawhHubSearchResponse>('/api/v1/search', { q: query });
        return (res.items ?? []).map(this.mapSkill);
    }

    async fetchRemoteSkill(slug: string): Promise<RemoteSkillItem | null> {
        // Get skill metadata
        let detail: ClawhHubSkillSummary;
        try {
            detail = await this.get<ClawhHubSkillSummary>(`/api/v1/skills/${slug}`);
        } catch {
            return null;
        }

        // Get SKILL.md content
        const content = await this.fetchSkillFile(slug);
        const mapped = this.mapSkill(detail);

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

    private mapSkill = (raw: ClawhHubSkillSummary): RemoteSkillItem => {
        const authorStr =
            typeof raw.author === 'string' ? raw.author : (raw.author?.display_name ?? raw.author?.username);

        const tags = Array.isArray(raw.tags)
            ? raw.tags
            : typeof raw.tags === 'string'
              ? raw.tags
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean)
              : undefined;

        return {
            name: raw.slug,
            description: raw.description,
            content: '',
            tags,
            author: authorStr,
            source_url: `${CLAWHUB_BASE_URL}/skills/${raw.slug}`,
            version: raw.latest_version ?? raw.version,
            downloads: raw.downloads,
            stars: raw.stars,
        };
    };
}

/**
 * 通用 HTTP 远程仓库实现
 * 通过字段映射适配任意 REST API
 */

import { BaseRemoteStore, type BaseRemoteStoreConfig } from './BaseRemoteStore.js';
import type { IRemotePromptStore, RemotePromptItem } from '../../interfaces/IRemotePromptStore.js';
import type { IRemoteSkillStore, RemoteSkillItem } from '../../interfaces/IRemoteSkillStore.js';

/**
 * 字段映射配置
 * key: 标准字段名，value: 远程 API 响应中的实际字段名
 */
export interface FieldMap {
    id?: string;
    name?: string;
    description?: string;
    content?: string;
    tags?: string;
    author?: string;
    source_url?: string;
}

export interface GenericStoreConfig extends BaseRemoteStoreConfig {
    /** 字段映射 */
    fieldMap?: FieldMap;
    /** API 路径配置 */
    paths?: {
        listPrompts?: string;
        searchPrompts?: string;
        getPrompt?: string;
        listSkills?: string;
        searchSkills?: string;
        getSkill?: string;
    };
}

export class GenericHttpRemoteStore extends BaseRemoteStore implements IRemotePromptStore, IRemoteSkillStore {
    private readonly fieldMap: Required<FieldMap>;
    private readonly paths: Required<NonNullable<GenericStoreConfig['paths']>>;

    constructor(config: GenericStoreConfig) {
        super(config);

        this.fieldMap = {
            id: config.fieldMap?.id ?? 'id',
            name: config.fieldMap?.name ?? 'name',
            description: config.fieldMap?.description ?? 'description',
            content: config.fieldMap?.content ?? 'content',
            tags: config.fieldMap?.tags ?? 'tags',
            author: config.fieldMap?.author ?? 'author',
            source_url: config.fieldMap?.source_url ?? 'source_url',
        };

        this.paths = {
            listPrompts: config.paths?.listPrompts ?? '/prompts',
            searchPrompts: config.paths?.searchPrompts ?? '/prompts/search',
            getPrompt: config.paths?.getPrompt ?? '/prompts',
            listSkills: config.paths?.listSkills ?? '/skills',
            searchSkills: config.paths?.searchSkills ?? '/skills/search',
            getSkill: config.paths?.getSkill ?? '/skills',
        };
    }

    // ========================================
    // IRemotePromptStore
    // ========================================

    async listRemotePrompts(options?: { page?: number; limit?: number }): Promise<RemotePromptItem[]> {
        const params: Record<string, string> = {};
        if (options?.page !== undefined) params['page'] = String(options.page);
        if (options?.limit !== undefined) params['limit'] = String(options.limit);

        const data = await this.get<any[]>(this.paths.listPrompts, params);
        return this.mapPrompts(Array.isArray(data) ? data : []);
    }

    async searchRemotePrompts(query: string): Promise<RemotePromptItem[]> {
        const data = await this.get<any[]>(this.paths.searchPrompts, { q: query });
        return this.mapPrompts(Array.isArray(data) ? data : []);
    }

    async fetchRemotePrompt(id: string): Promise<RemotePromptItem | null> {
        try {
            const data = await this.get<any>(`${this.paths.getPrompt}/${id}`);
            if (!data) return null;
            return this.mapPrompt(data);
        } catch {
            return null;
        }
    }

    // ========================================
    // IRemoteSkillStore
    // ========================================

    async listRemoteSkills(options?: { page?: number; limit?: number }): Promise<RemoteSkillItem[]> {
        const params: Record<string, string> = {};
        if (options?.page !== undefined) params['page'] = String(options.page);
        if (options?.limit !== undefined) params['limit'] = String(options.limit);

        const data = await this.get<any[]>(this.paths.listSkills, params);
        return this.mapSkills(Array.isArray(data) ? data : []);
    }

    async searchRemoteSkills(query: string): Promise<RemoteSkillItem[]> {
        const data = await this.get<any[]>(this.paths.searchSkills, { q: query });
        return this.mapSkills(Array.isArray(data) ? data : []);
    }

    async fetchRemoteSkill(name: string): Promise<RemoteSkillItem | null> {
        try {
            const data = await this.get<any>(`${this.paths.getSkill}/${name}`);
            if (!data) return null;
            return this.mapSkill(data);
        } catch {
            return null;
        }
    }

    // ========================================
    // 字段映射工具
    // ========================================

    private mapPrompt(raw: Record<string, any>): RemotePromptItem {
        const fm = this.fieldMap;
        return {
            id: String(raw[fm.id] ?? ''),
            name: String(raw[fm.name] ?? ''),
            description: raw[fm.description] ? String(raw[fm.description]) : undefined,
            content: String(raw[fm.content] ?? ''),
            tags: Array.isArray(raw[fm.tags]) ? raw[fm.tags] : undefined,
            author: raw[fm.author] ? String(raw[fm.author]) : undefined,
            source_url: raw[fm.source_url] ? String(raw[fm.source_url]) : undefined,
            metadata: raw['metadata'],
        };
    }

    private mapPrompts(raws: Record<string, any>[]): RemotePromptItem[] {
        return raws.map((r) => this.mapPrompt(r));
    }

    private mapSkill(raw: Record<string, any>): RemoteSkillItem {
        const fm = this.fieldMap;
        return {
            name: String(raw[fm.name] ?? ''),
            description: raw[fm.description] ? String(raw[fm.description]) : undefined,
            content: String(raw[fm.content] ?? ''),
            tags: Array.isArray(raw[fm.tags]) ? raw[fm.tags] : undefined,
            author: raw[fm.author] ? String(raw[fm.author]) : undefined,
            source_url: raw[fm.source_url] ? String(raw[fm.source_url]) : undefined,
        };
    }

    private mapSkills(raws: Record<string, any>[]): RemoteSkillItem[] {
        return raws.map((r) => this.mapSkill(r));
    }
}

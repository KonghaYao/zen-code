/**
 * MergedStorage - 合并型存储
 *
 * 组合 MemoryStorage（内置默认值）+ BunSqliteStorage（用户持久化数据）。
 * 读操作 DB 优先；写操作只写 DB，写前自动把被引用的内置记录迁移到 DB。
 */

import { z } from 'zod';
import type {
    IStorage,
    ModelRow,
    PromptRow,
    PromptVersionRow,
    PromptWithVersion,
    MiddlewareRow,
    AgentWithRelations,
    AgentRow,
} from '@langgraph-js/standard-agent';
import { ModelSchema, PromptSchema, MiddlewareSchema, AgentSchema } from '@langgraph-js/standard-agent';
import type { MemoryStorage } from '@langgraph-js/standard-agent';
import type { BunSqliteStorage } from '@langgraph-js/standard-agent/src/storage/sqlite.js';

// ========================================
// 工具函数
// ========================================

/** 合并两个数组，相同 id 的记录由 db 覆盖 base */
function mergeById<T extends { id: string }>(base: T[], db: T[]): T[] {
    const map = new Map<string, T>();
    for (const item of base) map.set(item.id, item);
    for (const item of db) map.set(item.id, item);
    return Array.from(map.values());
}

// ========================================
// MergedStorage
// ========================================

export class MergedStorage implements IStorage {
    constructor(
        private readonly base: MemoryStorage,
        private readonly db: BunSqliteStorage,
    ) {}

    // ========================================
    // 辅助方法（供路由层使用）
    // ========================================

    /** 判断某个 agent 是否为内置（DB 中没有同 id 记录即为内置） */
    async isBuiltin(id: string): Promise<boolean> {
        const dbAgent = await this.db.getAgent(id);
        return dbAgent === undefined;
    }

    /** 判断某个类型的记录在 DB 中是否存在覆盖 */
    async hasDbOverride(type: 'model' | 'prompt' | 'middleware' | 'agent', id: string): Promise<boolean> {
        switch (type) {
            case 'model':
                return (await this.db.getModel(id)) !== undefined;
            case 'prompt':
                return (await this.db.getPrompt(id)) !== undefined;
            case 'middleware':
                return (await this.db.getMiddleware(id)) !== undefined;
            case 'agent':
                return (await this.db.getAgent(id)) !== undefined;
        }
    }

    // ========================================
    // 惰性迁移：将内置记录同步到 DB（保证 FK 完整性）
    // ========================================

    private async _ensureModelInDb(modelId: string): Promise<void> {
        if (await this.db.getModel(modelId)) return;
        const baseModel = await this.base.getModel(modelId);
        if (!baseModel) throw new Error(`Model '${modelId}' not found in base storage`);
        await this.db.insertModel({
            id: baseModel.id,
            name: baseModel.name ?? undefined,
            provider_id: baseModel.provider_id,
            model_name: baseModel.model_name,
            stream_usage: baseModel.stream_usage === 1,
            enable_thinking: baseModel.enable_thinking === 1,
            temperature: baseModel.temperature,
            max_tokens: baseModel.max_tokens,
            top_p: baseModel.top_p,
            frequency_penalty: baseModel.frequency_penalty,
            presence_penalty: baseModel.presence_penalty,
        });
    }

    private async _ensurePromptInDb(promptId: string): Promise<void> {
        if (await this.db.getPrompt(promptId)) return;
        const basePrompt = await this.base.getPromptWithCurrentVersion(promptId);
        if (!basePrompt) throw new Error(`Prompt '${promptId}' not found in base storage`);
        await this.db.insertPrompt({ id: basePrompt.id, name: basePrompt.name }, basePrompt.content);
    }

    private async _ensureMiddlewaresInDb(middlewareIds: string[]): Promise<void> {
        for (const midId of middlewareIds) {
            if (midId.trim() === '') continue;
            if (await this.db.getMiddleware(midId)) continue;
            const baseMiddleware = await this.base.getMiddleware(midId);
            if (!baseMiddleware) throw new Error(`Middleware '${midId}' not found in base storage`);
            await this.db.insertMiddleware({
                id: baseMiddleware.id,
                name: baseMiddleware.name,
                description: baseMiddleware.description,
            });
        }
    }

    // ========================================
    // Lifecycle
    // ========================================

    async initialize(): Promise<void> {
        // db 生命周期由 bootstrap 管理，此处为空
    }

    async close(): Promise<void> {
        // db 生命周期由 bootstrap 管理，此处为空
    }

    // ========================================
    // Transactions
    // ========================================

    async transaction<T>(fn: () => T | Promise<T>): Promise<T> {
        return this.db.transaction(fn);
    }

    // ========================================
    // Models（读：DB 优先；写：只写 DB）
    // ========================================

    async insertModel(data: z.infer<typeof ModelSchema>): Promise<void> {
        return this.db.insertModel(data);
    }

    async getModel(id: string): Promise<ModelRow | undefined> {
        return (await this.db.getModel(id)) ?? (await this.base.getModel(id));
    }

    async getAllModels(): Promise<ModelRow[]> {
        const dbItems = await this.db.getAllModels();
        const baseItems = await this.base.getAllModels();
        return mergeById(baseItems, dbItems);
    }

    async updateModel(data: z.infer<typeof ModelSchema>): Promise<void> {
        await this._ensureModelInDb(data.id);
        return this.db.updateModel(data);
    }

    async deleteModel(id: string): Promise<void> {
        return this.db.deleteModel(id);
    }

    // ========================================
    // Prompts
    // ========================================

    async insertPrompt(data: z.infer<typeof PromptSchema>, content: string, changeNote?: string): Promise<void> {
        return this.db.insertPrompt(data, content, changeNote);
    }

    async getPrompt(id: string): Promise<PromptRow | undefined> {
        return (await this.db.getPrompt(id)) ?? (await this.base.getPrompt(id));
    }

    async getPromptByName(name: string): Promise<PromptRow | undefined> {
        return (await this.db.getPromptByName(name)) ?? (await this.base.getPromptByName(name));
    }

    async getPromptWithCurrentVersion(id: string): Promise<PromptWithVersion | undefined> {
        return (await this.db.getPromptWithCurrentVersion(id)) ?? (await this.base.getPromptWithCurrentVersion(id));
    }

    async getPromptWithCurrentVersionByName(name: string): Promise<PromptWithVersion | undefined> {
        return (
            (await this.db.getPromptWithCurrentVersionByName(name)) ??
            (await this.base.getPromptWithCurrentVersionByName(name))
        );
    }

    async getAllPrompts(): Promise<PromptRow[]> {
        const dbItems = await this.db.getAllPrompts();
        const baseItems = await this.base.getAllPrompts();
        return mergeById(baseItems, dbItems);
    }

    async getAllPromptsWithCurrentVersion(): Promise<PromptWithVersion[]> {
        const dbItems = await this.db.getAllPromptsWithCurrentVersion();
        const baseItems = await this.base.getAllPromptsWithCurrentVersion();
        return mergeById(baseItems, dbItems);
    }

    async updatePrompt(data: z.infer<typeof PromptSchema>): Promise<void> {
        await this._ensurePromptInDb(data.id);
        return this.db.updatePrompt(data);
    }

    async deletePrompt(id: string): Promise<void> {
        return this.db.deletePrompt(id);
    }

    // ========================================
    // Prompt Versions
    // ========================================

    async createPromptVersion(promptId: string, content: string, changeNote?: string): Promise<PromptVersionRow> {
        await this._ensurePromptInDb(promptId);
        return this.db.createPromptVersion(promptId, content, changeNote);
    }

    async getPromptVersion(promptId: string, version: number): Promise<PromptVersionRow | undefined> {
        return (
            (await this.db.getPromptVersion(promptId, version)) ?? (await this.base.getPromptVersion(promptId, version))
        );
    }

    async getPromptVersions(promptId: string): Promise<PromptVersionRow[]> {
        const dbVersions = await this.db.getPromptVersions(promptId);
        if (dbVersions.length > 0) return dbVersions;
        return this.base.getPromptVersions(promptId);
    }

    async rollbackPromptVersion(promptId: string, targetVersion: number): Promise<void> {
        await this._ensurePromptInDb(promptId);
        return this.db.rollbackPromptVersion(promptId, targetVersion);
    }

    // ========================================
    // Middlewares
    // ========================================

    async insertMiddleware(data: z.infer<typeof MiddlewareSchema>): Promise<void> {
        return this.db.insertMiddleware(data);
    }

    async getMiddleware(id: string): Promise<MiddlewareRow | undefined> {
        return (await this.db.getMiddleware(id)) ?? (await this.base.getMiddleware(id));
    }

    async getAllMiddlewares(): Promise<MiddlewareRow[]> {
        const dbItems = await this.db.getAllMiddlewares();
        const baseItems = await this.base.getAllMiddlewares();
        return mergeById(baseItems, dbItems);
    }

    async updateMiddleware(data: z.infer<typeof MiddlewareSchema>): Promise<void> {
        await this._ensureMiddlewaresInDb([data.id]);
        return this.db.updateMiddleware(data);
    }

    async deleteMiddleware(id: string): Promise<void> {
        return this.db.deleteMiddleware(id);
    }

    // ========================================
    // Agents
    // ========================================

    async insertAgent(data: z.infer<typeof AgentSchema>): Promise<void> {
        // 惰性迁移被引用的 model/prompt/middlewares
        await this._ensureModelInDb(data.model);
        await this._ensurePromptInDb(data.system_prompt);
        await this._ensureMiddlewaresInDb(Object.keys(data.middlewares));
        return this.db.insertAgent(data);
    }

    async getAgent(id: string): Promise<(AgentRow & { middlewares: Record<string, boolean | any> }) | undefined> {
        return (await this.db.getAgent(id)) ?? (await this.base.getAgent(id));
    }

    async getAllAgents(): Promise<(AgentRow & { middlewares: Record<string, boolean | any> })[]> {
        const dbItems = await this.db.getAllAgents();
        const baseItems = await this.base.getAllAgents();
        return mergeById(baseItems, dbItems);
    }

    async updateAgent(data: z.infer<typeof AgentSchema>): Promise<void> {
        // 若 DB 中已有该 agent，直接更新；否则以插入方式覆盖内置
        const exists = await this.db.getAgent(data.id);
        if (exists) {
            await this._ensureModelInDb(data.model);
            await this._ensurePromptInDb(data.system_prompt);
            await this._ensureMiddlewaresInDb(Object.keys(data.middlewares));
            return this.db.updateAgent(data);
        } else {
            return this.insertAgent(data);
        }
    }

    async deleteAgent(id: string): Promise<void> {
        return this.db.deleteAgent(id);
    }

    // ========================================
    // Query Helpers
    // ========================================

    async getAgentWithDependencies(id: string): Promise<AgentWithRelations | undefined> {
        // 先从 DB 查，再 fallback 到 base
        const dbResult = await this.db.getAgentWithDependencies(id);
        if (dbResult) return dbResult;
        return this.base.getAgentWithDependencies(id);
    }
}

/**
 * Remote Store Router
 * 远程 prompt/skill 仓库的浏览、搜索、导入
 */

import { z } from 'zod';
import { router, publicProcedure, handleNotFound } from './trpc.js';
import type { RemoteStoreStorage } from '../services/remote-store/index.js';
import { GenericHttpRemoteStore, ClawhHubStore, CLAWHUB_BASE_URL } from '@codegraph/config';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

// ========================================
// Schema
// ========================================

const RemoteStoreInputSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    type: z.enum(['generic_http', 'clawhub']).optional(),
    base_url: z.string().url().optional(),
    api_key: z.string().optional(),
    field_map: z.record(z.string()).optional(),
    paths: z.record(z.string()).optional(),
    enabled: z.boolean().optional(),
});

const RemoteStoreUpdateSchema = RemoteStoreInputSchema.partial().extend({
    id: z.string(),
});

// ========================================
// 工厂函数：根据存储记录创建 store 实例
// ========================================

function createStoreInstance(entry: {
    type: string;
    base_url: string;
    api_key?: string | null;
    field_map?: string | null;
    paths?: string | null;
}): GenericHttpRemoteStore | ClawhHubStore {
    if (entry.type === 'clawhub') {
        return new ClawhHubStore(entry.api_key ?? undefined);
    }
    return new GenericHttpRemoteStore({
        baseUrl: entry.base_url,
        apiKey: entry.api_key ?? undefined,
        fieldMap: entry.field_map ? JSON.parse(entry.field_map) : undefined,
        paths: entry.paths ? JSON.parse(entry.paths) : undefined,
    });
}

// ========================================
// Router 工厂（需要注入 RemoteStoreStorage）
// ========================================

export function createStoreRouter(remoteStoreStorage: RemoteStoreStorage) {
    return router({
        // ========================================
        // Store 配置管理
        // ========================================

        listStores: publicProcedure.query(() => {
            return remoteStoreStorage.list().map((s) => ({
                id: s.id,
                name: s.name,
                type: s.type,
                base_url: s.base_url,
                enabled: Boolean(s.enabled),
                created_at: s.created_at,
                updated_at: s.updated_at,
            }));
        }),

        addStore: publicProcedure.input(RemoteStoreInputSchema).mutation(({ input }) => {
            const id = input.id ?? crypto.randomUUID();
            const type = input.type ?? 'generic_http';
            const base_url = input.base_url ?? (type === 'clawhub' ? CLAWHUB_BASE_URL : '');
            return remoteStoreStorage.insert({
                ...input,
                id,
                type,
                base_url,
                enabled: input.enabled ?? true,
            });
        }),

        updateStore: publicProcedure.input(RemoteStoreUpdateSchema).mutation(({ input }) => {
            const result = remoteStoreStorage.update(input);
            if (!result) handleNotFound('RemoteStore', input.id);
            return result;
        }),

        deleteStore: publicProcedure.input(z.object({ id: z.string() })).mutation(({ input }) => {
            const ok = remoteStoreStorage.delete(input.id);
            if (!ok) handleNotFound('RemoteStore', input.id);
            return { id: input.id };
        }),

        // ========================================
        // Prompt 浏览与导入
        // ========================================

        listRemotePrompts: publicProcedure
            .input(z.object({ storeId: z.string(), page: z.number().optional(), limit: z.number().optional() }))
            .query(async ({ input }) => {
                const entry = remoteStoreStorage.get(input.storeId);
                if (!entry) handleNotFound('RemoteStore', input.storeId);
                const store = createStoreInstance(entry!);
                return store.listRemotePrompts({ page: input.page, limit: input.limit });
            }),

        searchRemotePrompts: publicProcedure
            .input(z.object({ storeId: z.string(), query: z.string() }))
            .query(async ({ input }) => {
                const entry = remoteStoreStorage.get(input.storeId);
                if (!entry) handleNotFound('RemoteStore', input.storeId);
                const store = createStoreInstance(entry!);
                return store.searchRemotePrompts(input.query);
            }),

        importPrompt: publicProcedure
            .input(z.object({ storeId: z.string(), promptId: z.string() }))
            .mutation(async ({ ctx, input }) => {
                const entry = remoteStoreStorage.get(input.storeId);
                if (!entry) handleNotFound('RemoteStore', input.storeId);
                const storeInstance = createStoreInstance(entry!);
                const item = await storeInstance.fetchRemotePrompt(input.promptId);
                if (!item) handleNotFound('RemotePrompt', input.promptId);

                const id = crypto.randomUUID();
                await ctx.agentPackage.storage.insertPrompt(
                    { id, name: item!.name, metadata: item!.metadata },
                    item!.content,
                    `Imported from remote store: ${entry!.name}`,
                );
                return { id, name: item!.name };
            }),

        // ========================================
        // Skill 浏览与导入
        // ========================================

        listRemoteSkills: publicProcedure
            .input(z.object({ storeId: z.string(), page: z.number().optional(), limit: z.number().optional() }))
            .query(async ({ input }) => {
                const entry = remoteStoreStorage.get(input.storeId);
                if (!entry) handleNotFound('RemoteStore', input.storeId);
                const store = createStoreInstance(entry!);
                return store.listRemoteSkills({ page: input.page, limit: input.limit });
            }),

        getRemoteSkill: publicProcedure
            .input(z.object({ storeId: z.string(), skillName: z.string() }))
            .query(async ({ input }) => {
                const entry = remoteStoreStorage.get(input.storeId);
                if (!entry) handleNotFound('RemoteStore', input.storeId);
                const store = createStoreInstance(entry!);
                const item = await store.fetchRemoteSkill(input.skillName);
                if (!item) handleNotFound('RemoteSkill', input.skillName);
                return item!;
            }),

        searchRemoteSkills: publicProcedure
            .input(z.object({ storeId: z.string(), query: z.string() }))
            .query(async ({ input }) => {
                const entry = remoteStoreStorage.get(input.storeId);
                if (!entry) handleNotFound('RemoteStore', input.storeId);
                const store = createStoreInstance(entry!);
                return store.searchRemoteSkills(input.query);
            }),

        importSkill: publicProcedure
            .input(z.object({ storeId: z.string(), skillName: z.string() }))
            .mutation(async ({ input }) => {
                const entry = remoteStoreStorage.get(input.storeId);
                if (!entry) handleNotFound('RemoteStore', input.storeId);
                const storeInstance = createStoreInstance(entry!);
                const item = await storeInstance.fetchRemoteSkill(input.skillName);
                if (!item) handleNotFound('RemoteSkill', input.skillName);

                // 写入 ~/.claude/skills/<name>/SKILL.md
                const skillName = item!.name || input.skillName;
                const skillDir = join(homedir(), '.claude', 'skills', skillName);
                mkdirSync(skillDir, { recursive: true });
                writeFileSync(join(skillDir, 'SKILL.md'), item!.content, 'utf-8');

                return { name: skillName };
            }),
    });
}

export type StoreRouter = ReturnType<typeof createStoreRouter>;

/**
 * Provider Router
 * 提供商配置管理 API
 */

import { z } from 'zod';
import { router, publicProcedure, handleNotFound, handleBadRequest, handleConflict } from './trpc.js';
import type { ProviderStorage, ProviderType } from '../services/provider/index.js';

// ========================================
// Schemas
// ========================================

export const ProviderTypeSchema = z.enum(['openai', 'anthropic']);

export const ProviderInputSchema = z.object({
    name: z.string().min(1, '名称不能为空').max(50, '名称不能超过 50 字符'),
    type: ProviderTypeSchema,
    apiKey: z.string().min(10, 'API Key 长度不足'),
    baseUrl: z.string().url('请输入有效的 URL'),
    isActive: z.boolean().optional().default(false),
});

export const ProviderUpdateSchema = z.object({
    id: z.string(),
    name: z.string().min(1, '名称不能为空').max(50, '名称不能超过 50 字符').optional(),
    type: ProviderTypeSchema.optional(),
    apiKey: z.string().min(10, 'API Key 长度不足').optional(),
    baseUrl: z.string().url('请输入有效的 URL').optional(),
    isActive: z.boolean().optional(),
});

export const ProviderSetActiveSchema = z.object({
    id: z.string(),
});

export const ProviderValidateSchema = z.object({
    type: ProviderTypeSchema,
    apiKey: z.string().min(10, 'API Key 长度不足'),
    baseUrl: z.string().url('请输入有效的 URL').optional(),
});

// ========================================
// Default Base URLs
// ========================================

export const DEFAULT_BASE_URLS: Record<ProviderType, string> = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com',
};

// ========================================
// Router Factory
// ========================================

export function createProviderRouter(providerStorage: ProviderStorage) {
    return router({
        // 列出所有提供商
        list: publicProcedure.query(async () => {
            const providers = await providerStorage.getAll();
            return providers;
        }),

        // 获取单个提供商
        get: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
            const provider = await providerStorage.getById(input.id);
            if (!provider) {
                handleNotFound('Provider', input.id);
            }
            return provider;
        }),

        // 获取活跃提供商
        getActive: publicProcedure.query(async () => {
            const provider = await providerStorage.getActive();
            return provider;
        }),

        // 创建提供商
        create: publicProcedure.input(ProviderInputSchema).mutation(async ({ input }) => {
            try {
                const provider = await providerStorage.create({
                    name: input.name,
                    type: input.type,
                    apiKey: input.apiKey,
                    baseUrl: input.baseUrl,
                    isActive: input.isActive,
                });
                return provider;
            } catch (error) {
                if (error instanceof Error && error.message.includes('已存在')) {
                    handleConflict(error.message);
                }
                throw error;
            }
        }),

        // 更新提供商
        update: publicProcedure.input(ProviderUpdateSchema).mutation(async ({ input }) => {
            try {
                const provider = await providerStorage.update({
                    id: input.id,
                    name: input.name,
                    type: input.type,
                    apiKey: input.apiKey,
                    baseUrl: input.baseUrl,
                    isActive: input.isActive,
                });
                return provider;
            } catch (error) {
                if (error instanceof Error && error.message.includes('不存在')) {
                    handleNotFound('Provider', input.id);
                }
                if (error instanceof Error && error.message.includes('已存在')) {
                    handleConflict(error.message);
                }
                throw error;
            }
        }),

        // 删除提供商
        delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
            try {
                await providerStorage.delete(input.id);
                return { success: true, id: input.id };
            } catch (error) {
                if (error instanceof Error && error.message.includes('不存在')) {
                    handleNotFound('Provider', input.id);
                }
                throw error;
            }
        }),

        // 设置活跃提供商
        setActive: publicProcedure.input(ProviderSetActiveSchema).mutation(async ({ input }) => {
            try {
                const provider = await providerStorage.setActive(input.id);
                return provider;
            } catch (error) {
                if (error instanceof Error && error.message.includes('不存在')) {
                    handleNotFound('Provider', input.id);
                }
                throw error;
            }
        }),

        // 获取默认 Base URL
        getDefaultBaseUrl: publicProcedure.input(z.object({ type: ProviderTypeSchema })).query(({ input }) => {
            return DEFAULT_BASE_URLS[input.type];
        }),

        // 验证 API Key 格式
        validateApiKey: publicProcedure.input(ProviderValidateSchema).query(({ input }) => {
            const { type, apiKey } = input;

            // 基本格式验证
            if (!apiKey || apiKey.length < 10) {
                return { valid: false, error: 'API Key 长度不足' };
            }

            // OpenAI API Key 通常以 sk- 开头
            if (type === 'openai' && !apiKey.startsWith('sk-')) {
                return { valid: false, error: 'OpenAI API Key 通常以 sk- 开头' };
            }

            // Anthropic API Key 通常以 sk-ant- 开头
            if (type === 'anthropic' && !apiKey.startsWith('sk-ant-')) {
                // 仅提示，不强制
                return { valid: true, warning: 'Anthropic API Key 通常以 sk-ant- 开头' };
            }

            return { valid: true };
        }),
    });
}

// 导出类型
export type ProviderRouter = ReturnType<typeof createProviderRouter>;

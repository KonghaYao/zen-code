/**
 * tRPC API 客户端
 * 浏览器端使用，从 CDN 加载 tRPC
 */

// 从 CDN 动态导入 tRPC
import { createTRPCProxyClient, httpLink } from '@trpc/client';

// ========================================
// 自定义 GET link for queries
// ========================================
const customHttpLink = httpLink({
    url: '/api/trpc',
    // 使用 fetch 的 method 选项
    fetch(url, options) {
        if (options?.body) {
            const body = JSON.parse(options.body as string);
            // 对于 query，转换为 GET 请求
            if (body[0]?.kind === 'query') {
                const params = new URLSearchParams({ input: JSON.stringify(body[0]?.input || {}) });
                const queryString = `${url}?${params.toString()}`;
                return fetch(queryString, {
                    ...options,
                    method: 'GET',
                    body: undefined,
                });
            }
        }
        // mutation 和其他情况使用 POST
        return fetch(url, options);
    },
});

// ========================================
// 创建 tRPC 客户端（使用 any 类型避免导入服务器端类型）
// ========================================
export const apiClient: any = createTRPCProxyClient({
    links: [customHttpLink],
});

// ========================================
// 导出便捷方法
// ========================================
export const agentsApi = apiClient.agents;
export const modelsApi = apiClient.models;
export const promptsApi = apiClient.prompts;
export const toolsApi = apiClient.tools;
export const middlewaresApi = apiClient.middlewares;
export const mcpApi = apiClient.mcp;

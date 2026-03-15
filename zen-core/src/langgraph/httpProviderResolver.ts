/**
 * HttpProviderResolver for zen-core
 *
 * 通过 HTTP 调用 zen-swarm 的 providers tRPC API 获取 provider 配置。
 * zen-swarm 未启动时，provider resolve 返回 null（自动 fallback 到环境变量）。
 */

import type { IProviderResolver, ResolvedProvider } from '@codegraph/agent/src/subagents/unified-factory.js';
import type { AgentPackage } from '@langgraph-js/standard-agent';

export class HttpProviderResolver implements IProviderResolver {
    private baseUrl: string;

    constructor(
        private agentPackage: AgentPackage,
        zenSwarmUrl?: string,
    ) {
        this.baseUrl = zenSwarmUrl || process.env.ZEN_SWARM_URL || 'http://127.0.0.1:8124';
    }

    async resolve(providerId: string): Promise<ResolvedProvider | null> {
        try {
            const url = `${this.baseUrl}/api/trpc/providers.resolveForAgent?input=${encodeURIComponent(JSON.stringify({ json: { id: providerId } }))}`;
            const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
            if (!res.ok) return null;
            const json = (await res.json()) as { result?: { data?: { json?: unknown } } };
            const provider = json?.result?.data?.json as {
                id: string;
                type: string;
                name: string;
                baseUrl: string;
                apiKey: string;
            } | null;
            if (!provider?.apiKey) return null;
            return {
                id: provider.id,
                type: provider.type as ResolvedProvider['type'],
                name: provider.name,
                baseUrl: provider.baseUrl,
                apiKey: provider.apiKey,
            };
        } catch {
            return null;
        }
    }

    async resolveByModel(modelId: string): Promise<ResolvedProvider | null> {
        const modelConfig = await this.agentPackage.getModel(modelId);
        if (!modelConfig?.provider_id) return null;
        return this.resolve(modelConfig.provider_id);
    }
}

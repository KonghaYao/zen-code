/**
 * DbProviderResolver for zen-core
 *
 * Resolves provider configuration from ProviderStorage (SQLite).
 * Used by createCodeGraph to support DB-based provider authentication.
 */

import type { IProviderResolver, ResolvedProvider } from '@codegraph/agent/src/subagents/unified-factory.js';
import type { AgentPackage } from '@langgraph-js/standard-agent';
import type { ProviderStorage } from '../services/provider/index.js';

export class DbProviderResolver implements IProviderResolver {
    constructor(
        private providerStorage: ProviderStorage,
        private agentPackage: AgentPackage,
    ) {}

    async resolve(providerId: string): Promise<ResolvedProvider | null> {
        const provider = await this.providerStorage.getById(providerId);
        if (!provider) return null;

        const apiKey = await this.providerStorage.getDecryptedApiKey(providerId);
        if (!apiKey) return null;

        return {
            id: provider.id,
            type: provider.type,
            name: provider.name,
            baseUrl: provider.baseUrl,
            apiKey,
        };
    }

    async resolveByModel(modelId: string): Promise<ResolvedProvider | null> {
        const modelConfig = await this.agentPackage.getModel(modelId);
        if (!modelConfig?.provider_id) return null;
        return this.resolve(modelConfig.provider_id);
    }
}

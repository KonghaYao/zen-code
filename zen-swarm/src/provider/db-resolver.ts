/**
 * Database Provider Resolver
 *
 * Resolves provider configuration from zen-swarm's ProviderStorage.
 * Supports multi-provider scenarios with encrypted API keys.
 */

import type { IProviderResolver, ResolvedProvider } from '@codegraph/agent/src';
import { providerStorage } from '../config/loader.js';

/**
 * Resolve provider from database
 * Used by zen-swarm Web UI
 */
export class DbProviderResolver implements IProviderResolver {
    async resolve(providerId: string): Promise<ResolvedProvider | null> {
        const provider = await providerStorage.getById(providerId);
        if (!provider) return null;

        const apiKey = await providerStorage.getDecryptedApiKey(providerId);
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
        // Import agentPackage to get model config
        const { agentPackage } = await import('../config/loader.js');

        const modelConfig = await agentPackage.getModel(modelId);
        if (!modelConfig?.provider_id) return null;

        return this.resolve(modelConfig.provider_id);
    }
}

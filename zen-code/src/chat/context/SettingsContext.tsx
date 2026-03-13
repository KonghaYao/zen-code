/**
 * Settings Context (zen-code version)
 *
 * Manages application settings using TanStack Query + zen-core tRPC.
 * All data fetched via zen-core, no local ConfigManager dependency.
 */

import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AppConfig, MCPConfig } from '@codegraph/config';
import { useConfig, useUpdateConfig } from '../hooks/useConfig';
import { queryKeys } from '../query-keys';
import { useTrpc } from './ZenCoreContext';

export interface ModelConfig {
    id: string;
    name: string;
    provider: 'openai' | 'anthropic' | 'gemini';
}

interface SettingsContextType {
    config: AppConfig | null;
    updateConfig: (newConfig: Partial<AppConfig>) => Promise<void>;
    extraParams: {
        provider_id: string;
        model_id: string;
        mcp_config?: MCPConfig;
        switch_command?: string;
    };
    AVAILABLE_MODELS: ModelConfig[];
    compactMode: boolean;
    toggleCompactMode: () => Promise<void>;
    showDetailedInfo: boolean;
    toggleDetailedInfo: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
    children: ReactNode;
}

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};

export const SettingsProvider = ({ children }: SettingsProviderProps) => {
    const trpc = useTrpc();
    const { data: config } = useConfig();
    const updateConfigMutation = useUpdateConfig();

    const providerId = config?.provider_id;
    const { data: AVAILABLE_MODELS = [] } = useQuery({
        queryKey: queryKeys.models.available(providerId),
        queryFn: () => trpc.models.list.query({ providerId: providerId! }),
        staleTime: 30 * 60 * 1000,
        retry: 1,
        enabled: !!providerId,
    });

    const extraParams = useMemo(() => {
        return {
            provider_id: config?.provider_id || 'openai',
            provider_type: config?.provider_type || 'openai',
            model_id: config?.model_id || AVAILABLE_MODELS[0]?.id || 'default',
            mcp_config: config?.mcp_config,
            enable_thinking: config?.enable_thinking ?? true,
            streaming: config?.streaming ?? false,
            switch_command: config?.switch_command || '',
            cwd: process.cwd(),
        };
    }, [
        config?.provider_id,
        config?.provider_type,
        config?.model_id,
        config?.mcp_config,
        config?.enable_thinking,
        config?.streaming,
        config?.switch_command,
        config?.providers,
        AVAILABLE_MODELS,
    ]);

    const compactMode = useMemo(() => config?.compact_mode ?? false, [config?.compact_mode]);

    const toggleCompactMode = async () => {
        await updateConfigMutation.mutateAsync({ compact_mode: !compactMode });
    };

    const showDetailedInfo = useMemo(() => config?.show_detailed_info ?? false, [config?.show_detailed_info]);

    const toggleDetailedInfo = async () => {
        await updateConfigMutation.mutateAsync({ show_detailed_info: !showDetailedInfo });
    };

    const updateConfig = async (newConfig: Partial<AppConfig>) => {
        await updateConfigMutation.mutateAsync(newConfig);
    };

    return (
        <SettingsContext.Provider
            value={{
                config: config || null,
                updateConfig,
                extraParams,
                AVAILABLE_MODELS,
                compactMode,
                toggleCompactMode,
                showDetailedInfo,
                toggleDetailedInfo,
            }}
        >
            {children}
        </SettingsContext.Provider>
    );
};

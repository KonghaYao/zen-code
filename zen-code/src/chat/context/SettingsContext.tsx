/**
 * Settings Context (zen-code version)
 *
 * Manages application settings using TanStack Query.
 * Replaces manual state management from packages/union-client.
 *
 * Key improvements:
 * - Uses TanStack Query for data fetching
 * - Automatic cache management
 * - Better error handling
 * - Less boilerplate code
 *
 * Note: This is zen-code specific version. The original version
 * in packages/union-client remains unchanged.
 */

import { createContext, useContext, useMemo, ReactNode, useEffect, useState, useRef } from 'react';
import { Box, Text } from 'ink';
import { useQuery } from '@tanstack/react-query';
import type { AppConfig, MCPConfig, ConfigManager } from '@codegraph/config';
import { createFSManager } from '@codegraph/config';
import { useConfig, useUpdateConfig } from '../hooks/useConfig';
import { queryKeys } from '../query-keys';

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
    manager: ConfigManager;
    compactMode: boolean;
    toggleCompactMode: () => Promise<void>;
    showDetailedInfo: boolean;
    toggleDetailedInfo: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
    get_allowed_models: () => Promise<ModelConfig[]>;
    children: ReactNode;
}

// 内部组件：在 manager 初始化后渲染
const SettingsProviderInternal = ({
    manager,
    get_allowed_models,
    children,
}: SettingsProviderProps & { manager: ConfigManager }) => {
    const { data: config, isLoading: configLoading, error: configError } = useConfig({ manager });
    const updateConfigMutation = useUpdateConfig({ manager });

    const {
        data: AVAILABLE_MODELS = [],
        isLoading: modelsLoading,
        error: modelsError,
    } = useQuery({
        queryKey: queryKeys.models.available(),
        queryFn: get_allowed_models,
        staleTime: 30 * 60 * 1000,
        retry: 1,
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
            cwd: process.cwd(), // 添加 cwd 字段，供 filesystem tools 使用
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

    const compactMode = useMemo(() => {
        return config?.compact_mode ?? false;
    }, [config?.compact_mode]);

    const toggleCompactMode = async () => {
        await updateConfigMutation.mutateAsync({ compact_mode: !compactMode });
    };

    const showDetailedInfo = useMemo(() => {
        return config?.show_detailed_info ?? false;
    }, [config?.show_detailed_info]);

    const toggleDetailedInfo = async () => {
        await updateConfigMutation.mutateAsync({ show_detailed_info: !showDetailedInfo });
    };

    const updateConfig = async (newConfig: Partial<AppConfig>) => {
        await updateConfigMutation.mutateAsync(newConfig);
    };

    if (configLoading || modelsLoading) {
        return (
            <Box padding={2}>
                <Text>Loading configuration...</Text>
            </Box>
        );
    }

    return (
        <SettingsContext.Provider
            value={{
                config: config || null,
                updateConfig,
                extraParams,
                AVAILABLE_MODELS,
                manager,
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

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};

/**
 * 外部组件：处理 ConfigManager 异步初始化，保持 hooks 调用顺序一致。
 *
 * ## 为什么用 useRef 而不是模块级单例？
 *
 * 原实现使用模块级变量（configManagerSingleton）作为单例，存在以下问题：
 * 1. 测试隔离困难：每个测试用例共享同一个单例，前一个测试的状态会污染后一个。
 * 2. 多实例问题：如果 SettingsProvider 被多次挂载（如 HMR 或多根节点场景），
 *    所有实例共享同一个 manager，可能造成状态混乱。
 * 3. 生命周期不匹配：单例永远不会被销毁，即使 Provider 已卸载。
 *
 * 改用 useRef 将初始化 Promise 绑定到组件实例：
 * - 组件卸载时，ref 随之释放（GC 可回收）
 * - 同一组件实例内仍只初始化一次（Strict Mode 下 Effect 双调用安全）
 * - 不同组件实例拥有独立的 manager，互不影响
 */
export const SettingsProvider = ({ get_allowed_models, children }: SettingsProviderProps) => {
    const [manager, setManager] = useState<ConfigManager | null>(null);

    // 用 ref 持有初始化 Promise，确保同一组件实例内只调用一次 createFSManager()
    // 即使在 React StrictMode 下 useEffect 被双调用，也不会重复创建
    const initPromiseRef = useRef<Promise<ConfigManager> | null>(null);

    useEffect(() => {
        // 如果已经在初始化中，直接复用同一个 Promise
        if (!initPromiseRef.current) {
            initPromiseRef.current = createFSManager();
        }
        let cancelled = false;
        initPromiseRef.current.then((m) => {
            if (!cancelled) setManager(m);
        });
        // cleanup：StrictMode 第一次执行的 effect 被取消时，不 setState
        return () => {
            cancelled = true;
        };
    }, []); // 空依赖：只在挂载时执行一次

    if (!manager) {
        return (
            <Box padding={2}>
                <Text>Initializing configuration manager...</Text>
            </Box>
        );
    }

    return (
        <SettingsProviderInternal manager={manager} get_allowed_models={get_allowed_models}>
            {children}
        </SettingsProviderInternal>
    );
};

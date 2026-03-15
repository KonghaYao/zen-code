import { createContext, useContext, useState, useRef, ReactNode, useEffect, useMemo } from 'react';
import { useUnmount, useIsMounted } from 'usehooks-ts';
import type { AppConfig, MCPConfig, ConfigManager } from '@codegraph/config';

export interface ModelConfig {
    id: string;
    name: string;
    provider: 'openai' | 'anthropic';
}

interface SettingsContextType {
    config: AppConfig | null;
    updateConfig: (newConfig: Partial<AppConfig>) => Promise<void>;
    extraParams: {
        provider_id: string;
        model_id: string;
        mcp_config?: MCPConfig;
        active_agent?: string;
    };
    AVAILABLE_MODELS: ModelConfig[];
    manager: ConfigManager;
    compactMode: boolean;
    toggleCompactMode: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
    manager: ConfigManager;
    get_allowed_models: () => Promise<ModelConfig[]>;
    children: ReactNode;
}

export const SettingsProvider = ({ manager, get_allowed_models, children }: SettingsProviderProps) => {
    const [config, setConfig] = useState<AppConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [AVAILABLE_MODELS, setModels] = useState<ModelConfig[]>([]);

    // 使用 usehooks-ts 的 useIsMounted 检查组件是否已挂载
    const isMounted = useIsMounted();

    // AbortController 引用，用于取消异步操作
    const abortControllerRef = useRef<AbortController | null>(null);

    // 使用 useRef 避免循环依赖：extraParams.model_id 使用 AVAILABLE_MODELS[0] 导致 models 变化时 extraParams 变化
    const availableModelsRef = useRef<ModelConfig[]>([]);
    availableModelsRef.current = AVAILABLE_MODELS;

    const extraParams = useMemo(() => {
        return {
            provider_id: config?.provider_id || 'default',
            model_id: config?.model_id || availableModelsRef.current[0]?.id,
            mcp_config: config?.mcp_config,
            enable_thinking: config?.enable_thinking ?? true,
            active_agent: config?.active_agent || '',
        };
    }, [config?.provider_id, config?.model_id, config?.mcp_config, config?.enable_thinking, config?.active_agent]);

    const compactMode = useMemo(() => {
        return config?.compact_mode ?? false;
    }, [config]);

    const toggleCompactMode = async () => {
        await updateConfig({ compact_mode: !compactMode });
    };

    const loadConfig = async (signal?: AbortSignal) => {
        // 检查是否已取消或组件已卸载
        if (signal?.aborted || !isMounted()) return;

        try {
            await manager.initialize();

            if (signal?.aborted || !isMounted()) return;
            const loadedConfig = await manager.getConfig();

            // 并行加载模型列表
            const models = await get_allowed_models().catch(() => []);

            if (signal?.aborted || !isMounted()) return;
            setModels(models);

            // 如果配置中没有 provider_id/model_id，使用第一个可用模型
            if ((!loadedConfig.provider_id || !loadedConfig.model_id) && models[0]) {
                const newConfig: Partial<AppConfig> = {
                    provider_id: models[0].provider,
                    model_id: models[0].id,
                };

                if (signal?.aborted || !isMounted()) return;
                await manager.updateConfig(newConfig);

                if (signal?.aborted || !isMounted()) return;
                const updatedConfig = await manager.getConfig();

                if (signal?.aborted || !isMounted()) return;
                setConfig(updatedConfig);
            } else {
                if (signal?.aborted || !isMounted()) return;
                setConfig(loadedConfig);
            }

            if (signal?.aborted || !isMounted()) return;
            setLoading(false);
        } catch (error) {
            if (!signal?.aborted && isMounted()) {
                console.error('Failed to load config:', error);
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        // 创建新的 AbortController
        abortControllerRef.current = new AbortController();

        loadConfig(abortControllerRef.current.signal);

        // 清理函数
        return () => {
            // 取消进行中的异步操作
            abortControllerRef.current?.abort();
            abortControllerRef.current = null;
        };
    }, [manager]); // 只依赖 manager

    const updateConfig = async (newConfig: Partial<AppConfig>, signal?: AbortSignal) => {
        // 检查是否已取消或组件已卸载
        if (signal?.aborted || !isMounted()) return;

        try {
            await manager.updateConfig(newConfig);

            if (signal?.aborted || !isMounted()) return;
            const updatedConfig = await manager.getConfig();

            if (signal?.aborted || !isMounted()) return;
            setConfig(updatedConfig);
        } catch (error) {
            if (!signal?.aborted && isMounted()) {
                console.error('Failed to update config:', error);
            }
        }
    };

    // 组件卸载时的清理
    useUnmount(() => {
        // 取消所有进行中的异步操作
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;

        // 可选：清理 manager 资源
        // if (manager?.cleanup) {
        //     manager.cleanup();
        // }
    });

    if (loading) {
        return null; // 或者显示加载指示器
    }

    return (
        <SettingsContext.Provider
            value={{ config, updateConfig, extraParams, AVAILABLE_MODELS, manager, compactMode, toggleCompactMode }}
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

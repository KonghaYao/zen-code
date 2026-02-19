/**
 * 全局状态管理
 * 使用 React Hooks (useState, useCallback) 实现响应式状态
 */

import { useState, useCallback, useEffect } from 'react';
import type { Agent, Model, Prompt, Tool, Middleware, MCPServer } from '../types/index.js';
import { apiClient } from '../api.js';

// ========================================
// Agents Store
// ========================================
export function useAgentsStore() {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadAgents = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiClient.agents.list.query();
            setAgents(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const createAgent = useCallback(
        async (input: any) => {
            const agent = await apiClient.agents.create.mutate(input);
            await loadAgents();
            return agent;
        },
        [loadAgents],
    );

    const updateAgent = useCallback(
        async (input: any) => {
            const agent = await apiClient.agents.update.mutate(input);
            await loadAgents();
            return agent;
        },
        [loadAgents],
    );

    const deleteAgent = useCallback(
        async (id: string) => {
            await apiClient.agents.delete.mutate({ id });
            await loadAgents();
        },
        [loadAgents],
    );

    return {
        agents,
        agentsLoading: loading,
        agentsError: error,
        agentCount: agents.length,
        loadAgents,
        createAgent,
        updateAgent,
        deleteAgent,
    };
}

// ========================================
// Models Store
// ========================================
export function useModelsStore() {
    const [models, setModels] = useState<Model[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadModels = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiClient.models.list.query();
            setModels(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const createModel = useCallback(
        async (input: any) => {
            const model = await apiClient.models.create.mutate(input);
            await loadModels();
            return model;
        },
        [loadModels],
    );

    const updateModel = useCallback(
        async (input: any) => {
            const model = await apiClient.models.update.mutate(input);
            await loadModels();
            return model;
        },
        [loadModels],
    );

    const deleteModel = useCallback(
        async (id: string) => {
            await apiClient.models.delete.mutate({ id });
            await loadModels();
        },
        [loadModels],
    );

    return {
        models,
        modelsLoading: loading,
        modelsError: error,
        modelCount: models.length,
        loadModels,
        createModel,
        updateModel,
        deleteModel,
    };
}

// ========================================
// Prompts Store
// ========================================
export function usePromptsStore() {
    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadPrompts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiClient.prompts.list.query();
            setPrompts(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const createPrompt = useCallback(
        async (input: any) => {
            const prompt = await apiClient.prompts.create.mutate(input);
            await loadPrompts();
            return prompt;
        },
        [loadPrompts],
    );

    const updatePrompt = useCallback(
        async (input: any) => {
            const prompt = await apiClient.prompts.update.mutate(input);
            await loadPrompts();
            return prompt;
        },
        [loadPrompts],
    );

    const deletePrompt = useCallback(
        async (id: string) => {
            await apiClient.prompts.delete.mutate({ id });
            await loadPrompts();
        },
        [loadPrompts],
    );

    return {
        prompts,
        promptsLoading: loading,
        promptsError: error,
        promptCount: prompts.length,
        loadPrompts,
        createPrompt,
        updatePrompt,
        deletePrompt,
    };
}

// ========================================
// Tools Store
// ========================================
export function useToolsStore() {
    const [tools, setTools] = useState<Tool[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadTools = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiClient.tools.list.query();
            setTools(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const createTool = useCallback(
        async (input: any) => {
            const tool = await apiClient.tools.create.mutate(input);
            await loadTools();
            return tool;
        },
        [loadTools],
    );

    const updateTool = useCallback(
        async (input: any) => {
            const tool = await apiClient.tools.update.mutate(input);
            await loadTools();
            return tool;
        },
        [loadTools],
    );

    const deleteTool = useCallback(
        async (id: string) => {
            await apiClient.tools.delete.mutate({ id });
            await loadTools();
        },
        [loadTools],
    );

    return {
        tools,
        toolsLoading: loading,
        toolsError: error,
        toolCount: tools.length,
        loadTools,
        createTool,
        updateTool,
        deleteTool,
    };
}

// ========================================
// Middlewares Store
// ========================================
export function useMiddlewaresStore() {
    const [middlewares, setMiddlewares] = useState<Middleware[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadMiddlewares = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiClient.middlewares.list.query();
            setMiddlewares(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const createMiddleware = useCallback(
        async (input: any) => {
            const middleware = await apiClient.middlewares.create.mutate(input);
            await loadMiddlewares();
            return middleware;
        },
        [loadMiddlewares],
    );

    const updateMiddleware = useCallback(
        async (input: any) => {
            const middleware = await apiClient.middlewares.update.mutate(input);
            await loadMiddlewares();
            return middleware;
        },
        [loadMiddlewares],
    );

    const deleteMiddleware = useCallback(
        async (id: string) => {
            await apiClient.middlewares.delete.mutate({ id });
            await loadMiddlewares();
        },
        [loadMiddlewares],
    );

    return {
        middlewares,
        middlewaresLoading: loading,
        middlewaresError: error,
        middlewareCount: middlewares.length,
        loadMiddlewares,
        createMiddleware,
        updateMiddleware,
        deleteMiddleware,
    };
}

// ========================================
// MCP Store
// ========================================
export function useMcpStore() {
    const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadMcpServers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiClient.mcp.list.query();
            setMcpServers(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        mcpServers,
        mcpLoading: loading,
        mcpError: error,
        mcpCount: mcpServers.length,
        loadMcpServers,
    };
}

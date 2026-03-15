/**
 * 全局状态管理
 * 使用 React Hooks (useState, useCallback) 实现响应式状态
 */

import { useState, useCallback } from 'react';
import type { Agent, Model, Prompt, Middleware, MCPServer } from '../types/index.js';
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
            setModels(data.map((m) => ({ ...m, name: m.name ?? undefined })));
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

    const createMcpServer = useCallback(
        async (input: any) => {
            const server = await apiClient.mcp.create.mutate(input);
            await loadMcpServers();
            return server;
        },
        [loadMcpServers],
    );

    const updateMcpServer = useCallback(
        async (input: any) => {
            const server = await apiClient.mcp.update.mutate(input);
            await loadMcpServers();
            return server;
        },
        [loadMcpServers],
    );

    const deleteMcpServer = useCallback(
        async (id: string) => {
            await apiClient.mcp.delete.mutate({ id });
            await loadMcpServers();
        },
        [loadMcpServers],
    );

    return {
        mcpServers,
        mcpLoading: loading,
        mcpError: error,
        mcpCount: mcpServers.length,
        loadMcpServers,
        createMcpServer,
        updateMcpServer,
        deleteMcpServer,
    };
}

/**
 * AgentCard 组件 - 单个 Agent 卡片展示
 */

import { useState, useEffect } from 'react';
import type { Agent, Model, Prompt, Tool, Middleware } from '../../../types/index.js';
import { apiClient } from '../../../api.js';

interface AgentCardProps {
    agent: Agent;
    onEdit: (agent: Agent) => void;
    onDelete: (id: string) => void;
}

export function AgentCard(props: AgentCardProps) {
    // Direct state with tRPC
    const [models, setModels] = useState<Model[]>([]);
    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [tools, setTools] = useState<Tool[]>([]);
    const [middlewares, setMiddlewares] = useState<Middleware[]>([]);

    useEffect(() => {
        const loadReferenceData = async () => {
            try {
                const [modelsData, promptsData, toolsData, middlewaresData] = await Promise.all([
                    apiClient.models.list.query(),
                    apiClient.prompts.list.query(),
                    apiClient.tools.list.query(),
                    apiClient.middlewares.list.query(),
                ]);
                setModels(modelsData);
                setPrompts(promptsData);
                setTools(toolsData);
                setMiddlewares(middlewaresData);
            } catch (e) {
                console.error('Failed to load reference data:', e);
            }
        };
        loadReferenceData();
    }, []);

    const getModelName = () => {
        const model = models.find((m) => m.id === props.agent.model);
        return model ? model.model_name : props.agent.model;
    };

    const getPromptName = () => {
        const prompt = prompts.find((p) => p.id === props.agent.system_prompt);
        return prompt ? prompt.name : props.agent.system_prompt;
    };

    const getToolName = (toolId: string) => {
        const tool = tools.find((t) => t.id === toolId);
        return tool ? tool.name : toolId;
    };

    const getMiddlewareName = (midId: string) => {
        const mid = middlewares.find((m) => m.id === midId);
        return mid ? mid.name : midId;
    };

    const hasToolsOrMiddlewares =
        Object.keys(props.agent.tools || {}).length > 0 || Object.keys(props.agent.middlewares || {}).length > 0;

    return (
        <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <h3 className="text-lg font-medium text-white mb-1">{props.agent.name}</h3>
                    <p className="text-sm text-gray-500 mb-2">ID: {props.agent.id}</p>
                    <p className="text-sm text-gray-400 mb-2">{props.agent.description || 'No description'}</p>

                    <div className="flex flex-wrap gap-3 text-xs">
                        <div className="flex items-center gap-1">
                            <span className="text-gray-500">Model:</span>
                            <span className="text-blue-400">{getModelName()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-gray-500">Prompt:</span>
                            <span className="text-green-400">{getPromptName()}</span>
                        </div>
                    </div>

                    {hasToolsOrMiddlewares && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {Object.keys(props.agent.tools || {}).map((toolId) => (
                                <span
                                    key={toolId}
                                    className="px-2 py-0.5 bg-purple-900/50 text-purple-300 text-xs rounded"
                                >
                                    {getToolName(toolId)}
                                </span>
                            ))}
                            {Object.keys(props.agent.middlewares || {}).map((midId) => (
                                <span
                                    key={midId}
                                    className="px-2 py-0.5 bg-yellow-900/50 text-yellow-300 text-xs rounded"
                                >
                                    {getMiddlewareName(midId)}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => props.onEdit(props.agent)}
                        className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded"
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => props.onDelete(props.agent.id)}
                        className="px-3 py-1 text-sm bg-red-900/50 hover:bg-red-800 text-red-300 rounded"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

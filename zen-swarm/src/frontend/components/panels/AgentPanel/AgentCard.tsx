/**
 * AgentCard 组件 - 单个 Agent 卡片展示
 *
 * 优化点：
 * - 通过 props 传入依赖数据（models, prompts, middlewares）
 * - 使用 Map 优化查找性能（规则：js-index-maps）
 * - 工具函数提取到外部（规则：rerender-memo-with-default-value）
 */

import type { Agent, Model, Prompt, Middleware } from '../../../types/index.js';
import { getModelName, getPromptName, getMiddlewareName } from '../../../utils/agentHelpers.js';
import { Edit, Trash2 } from '../../ui/Icons.js';
import { IconButton } from '../../ui/IconButton.js';

interface AgentCardProps {
    agent: Agent;
    onEdit: (agent: Agent) => void;
    onDelete: (id: string) => void;
    // 使用 Map 优化查找（规则：js-index-maps）
    modelMap: Map<string, Model>;
    promptMap: Map<string, Prompt>;
    middlewareMap: Map<string, Middleware>;
}

export function AgentCard(props: AgentCardProps) {
    const { agent, modelMap, promptMap, middlewareMap } = props;

    const hasMiddlewares = Object.keys(agent.middlewares || {}).length > 0;

    const modelName = getModelName(agent, modelMap);
    const promptName = getPromptName(agent, promptMap);

    return (
        <div className="bg-white rounded-lg p-6 hover:bg-gray-50 transition-colors border border-gray-200">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-1">{agent.name}</h3>
                    <p className="text-sm text-gray-400 mb-2">ID: {agent.id}</p>
                    <p className="text-sm text-gray-600 mb-2">{agent.description || 'No description'}</p>

                    <div className="flex flex-wrap gap-3 text-xs">
                        <div className="flex items-center gap-1">
                            <span className="text-gray-400">Model:</span>
                            <span className="text-blue-600">{modelName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-gray-400">Prompt:</span>
                            <span className="text-green-600">{promptName}</span>
                        </div>
                    </div>

                    {hasMiddlewares && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {Object.keys(agent.middlewares || {}).map((midId) => (
                                <span key={midId} className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded">
                                    {getMiddlewareName(midId, middlewareMap)}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex gap-1">
                    <IconButton onClick={() => props.onEdit(props.agent)} variant="primary" title="Edit">
                        <Edit className="w-4 h-4" />
                    </IconButton>
                    <IconButton onClick={() => props.onDelete(props.agent.id)} variant="danger" title="Delete">
                        <Trash2 className="w-4 h-4" />
                    </IconButton>
                </div>
            </div>
        </div>
    );
}

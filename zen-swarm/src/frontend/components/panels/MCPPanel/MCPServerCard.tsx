/**
 * MCPServerCard 组件 - 单个 MCP Server 卡片展示
 */

import type { MCPServer, McpServerConfig } from '../../../types/index.js';

interface MCPServerCardProps {
    server: MCPServer;
    onEdit: (server: MCPServer) => void;
    onDelete: (id: string) => void;
}

export function MCPServerCard(props: MCPServerCardProps) {
    const config = props.server.config as McpServerConfig;

    const getTypeIcon = () => {
        switch (config.type) {
            case 'stdio':
                return '🔄';
            case 'http':
                return '🌐';
            case 'ws':
                return '📡';
            default:
                return '❓';
        }
    };

    const getEnvPreview = () => {
        if (!config.env || Object.keys(config.env).length === 0) {
            return 'No environment variables';
        }
        return Object.entries(config.env)
            .map(([key]) => `${key}=***`)
            .join(', ');
    };

    return (
        <div className="bg-white rounded-lg p-6 hover:bg-gray-50 transition-colors border border-gray-200">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="text-2xl">{getTypeIcon()}</span>
                        <h3 className="text-lg font-medium text-gray-900">{props.server.name}</h3>
                        <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                                props.server.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                            }`}
                        >
                            {props.server.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">ID: {props.server.id}</p>
                    <div className="text-sm text-gray-600 mb-3">
                        Type: <span className="text-blue-600 uppercase">{config.type}</span>
                    </div>

                    {config.type === 'stdio' && config.command && (
                        <div className="bg-gray-50 rounded p-3 text-xs font-mono text-gray-700 mb-2 border border-gray-200">
                            <div className="mb-1 text-gray-400">Command:</div>
                            <div className="text-gray-900">
                                {config.command} {config.args?.map((arg) => arg).join(' ')}
                            </div>
                        </div>
                    )}

                    {(config.type === 'http' || config.type === 'ws') && config.url && (
                        <div className="bg-gray-50 rounded p-3 text-xs font-mono text-gray-700 mb-2 border border-gray-200">
                            <div className="mb-1 text-gray-400">URL:</div>
                            <div className="text-blue-600">{config.url}</div>
                        </div>
                    )}

                    {config.env && Object.keys(config.env).length > 0 && (
                        <div className="bg-gray-50 rounded p-3 text-xs font-mono text-gray-700 border border-gray-200">
                            <div className="mb-1 text-gray-400">Environment Variables:</div>
                            <div className="text-amber-600">{getEnvPreview()}</div>
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => props.onEdit(props.server)}
                        className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => props.onDelete(props.server.id)}
                        className="px-3 py-1 text-sm bg-red-50 hover:bg-red-100 text-red-600 rounded"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

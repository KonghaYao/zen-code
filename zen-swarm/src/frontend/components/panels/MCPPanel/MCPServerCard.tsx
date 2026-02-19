/**
 * MCPServerCard 组件 - 单个 MCP Server 卡片展示
 */

import type { MCPServer } from '../../../types/index.js';

interface MCPServerCardProps {
    server: MCPServer;
    onEdit: (server: MCPServer) => void;
    onDelete: (id: string) => void;
}

export function MCPServerCard(props: MCPServerCardProps) {
    const getTypeIcon = () => {
        switch (props.server.type) {
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
        if (!props.server.env || Object.keys(props.server.env).length === 0) {
            return 'No environment variables';
        }
        return Object.entries(props.server.env)
            .map(([key]) => `${key}=***`)
            .join(', ');
    };

    return (
        <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="text-2xl">{getTypeIcon()}</span>
                        <h3 className="text-lg font-medium text-white">{props.server.name}</h3>
                        <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                                props.server.enabled ? 'bg-green-900/50 text-green-300' : 'bg-gray-700 text-gray-400'
                            }`}
                        >
                            {props.server.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">ID: {props.server.id}</p>
                    <div className="text-sm text-gray-400 mb-3">
                        Type: <span className="text-blue-400 uppercase">{props.server.type}</span>
                    </div>

                    {props.server.type === 'stdio' && props.server.command && (
                        <div className="bg-gray-900 rounded p-3 text-xs font-mono text-gray-300 mb-2">
                            <div className="mb-1 text-gray-500">Command:</div>
                            <div className="text-white">
                                {props.server.command} {props.server.args?.map((arg) => arg).join(' ')}
                            </div>
                        </div>
                    )}

                    {(props.server.type === 'http' || props.server.type === 'ws') && props.server.url && (
                        <div className="bg-gray-900 rounded p-3 text-xs font-mono text-gray-300 mb-2">
                            <div className="mb-1 text-gray-500">URL:</div>
                            <div className="text-blue-400">{props.server.url}</div>
                        </div>
                    )}

                    {props.server.env && Object.keys(props.server.env).length > 0 && (
                        <div className="bg-gray-900 rounded p-3 text-xs font-mono text-gray-300">
                            <div className="mb-1 text-gray-500">Environment Variables:</div>
                            <div className="text-yellow-400">{getEnvPreview()}</div>
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => props.onEdit(props.server)}
                        className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded"
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => props.onDelete(props.server.id)}
                        className="px-3 py-1 text-sm bg-red-900/50 hover:bg-red-800 text-red-300 rounded"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

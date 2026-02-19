/**
 * MCPServerForm 组件 - 创建/编辑表单
 */

import { useState, useEffect } from 'react';
import type { MCPServer } from '../../../types/index.js';

interface MCPServerFormProps {
    server: MCPServer | null;
    onSave: (formData: any) => Promise<void>;
    onCancel: () => void;
}

export function MCPServerForm(props: MCPServerFormProps) {
    const [id, setId] = useState('');
    const [jsonConfig, setJsonConfig] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (props.server) {
            setId(props.server.id);
            const config = props.server.config;
            // 移除 config 中的 name 字段（使用 id 代替）
            const { name, ...configWithoutName } = config as any;
            setJsonConfig(JSON.stringify(configWithoutName, null, 2));
        } else {
            setId('');
            setJsonConfig(
                JSON.stringify(
                    {
                        type: 'stdio',
                        command: 'npx',
                        args: ['@modelcontextprotocol/server-filesystem', '/path/to/dir'],
                        enabled: true,
                    },
                    null,
                    2,
                ),
            );
        }
    }, [props.server]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const config = JSON.parse(jsonConfig);

            // Validate required fields
            if (!config.type || !['stdio', 'http', 'ws'].includes(config.type)) {
                throw new Error('type must be "stdio", "http", or "ws"');
            }

            // Validate type-specific fields
            if (config.type === 'stdio' && !config.command) {
                throw new Error('command is required for stdio type');
            }
            if ((config.type === 'http' || config.type === 'ws') && !config.url) {
                throw new Error('url is required for http/ws type');
            }

            const data = {
                id: id,
                name: id, // name 从 id 获取
                config: config,
                enabled: config.enabled ?? true,
            };

            await props.onSave(data);
        } catch (e: any) {
            if (e instanceof SyntaxError) {
                setError('Invalid JSON format');
            } else {
                setError(e.message);
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">{error}</div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Server ID</label>
                <input
                    type="text"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., my_mcp_server"
                    disabled={!!props.server}
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Configuration (JSON)</label>
                <div className="text-xs text-gray-400 mb-2">
                    Example:{' '}
                    {`{"type": "stdio", "command": "npx", "args": ["@modelcontextprotocol/server-filesystem", "/path"], "enabled": true}`}
                </div>
                <textarea
                    value={jsonConfig}
                    onChange={(e) => setJsonConfig(e.target.value)}
                    rows={20}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder='{"type": "stdio", "command": "npx", ...}'
                />
            </div>

            <div className="flex justify-end gap-3 pt-2">
                <button
                    type="button"
                    onClick={props.onCancel}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300 rounded-lg text-sm font-medium transition-colors"
                >
                    {saving ? 'Saving...' : props.server ? 'Update' : 'Add'}
                </button>
            </div>
        </form>
    );
}

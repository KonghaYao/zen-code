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
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        type: 'stdio' as 'stdio' | 'http' | 'ws',
        command: '',
        args: '',
        url: '',
        env: '',
        enabled: true,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (props.server) {
            setFormData({
                id: props.server.id,
                name: props.server.name,
                type: props.server.type,
                command: props.server.command || '',
                args: props.server.args?.join(' ') || '',
                url: props.server.url || '',
                env: props.server.env ? JSON.stringify(props.server.env, null, 2) : '',
                enabled: props.server.enabled,
            });
        } else {
            setFormData({
                id: '',
                name: '',
                type: 'stdio',
                command: '',
                args: '',
                url: '',
                env: '',
                enabled: true,
            });
        }
    }, [props.server]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            // Parse args and env
            const argsArray = formData.args.trim() ? formData.args.split(/\s+/).filter((arg) => arg.length > 0) : [];

            let envObj: Record<string, string> = {};
            if (formData.env.trim()) {
                envObj = JSON.parse(formData.env);
            }

            const data = {
                id: formData.id,
                name: formData.name,
                type: formData.type,
                command: formData.type === 'stdio' ? formData.command : undefined,
                args: formData.type === 'stdio' ? argsArray : undefined,
                url: formData.type === 'http' || formData.type === 'ws' ? formData.url : undefined,
                env: Object.keys(envObj).length > 0 ? envObj : undefined,
                enabled: formData.enabled,
            };

            await props.onSave(data);
        } catch (e: any) {
            if (e instanceof SyntaxError) {
                setError('Invalid JSON in environment variables field');
            } else {
                setError(e.message);
            }
        } finally {
            setSaving(false);
        }
    };

    const handleChange =
        (field: keyof typeof formData) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
            const value =
                field === 'enabled'
                    ? (e.target as HTMLInputElement).checked
                    : field === 'type'
                      ? (e.target.value as 'stdio' | 'http' | 'ws')
                      : e.target.value;
            setFormData({ ...formData, [field]: value });
        };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 text-red-300 text-sm">{error}</div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Server ID</label>
                <input
                    type="text"
                    value={formData.id}
                    onChange={handleChange('id')}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., my_mcp_server"
                    disabled={!!props.server}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Server Name</label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={handleChange('name')}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., My MCP Server"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Server Type</label>
                <select
                    value={formData.type}
                    onChange={handleChange('type')}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                >
                    <option value="stdio">STDIO (Command)</option>
                    <option value="http">HTTP</option>
                    <option value="ws">WebSocket</option>
                </select>
            </div>

            {formData.type === 'stdio' && (
                <>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Command</label>
                        <input
                            type="text"
                            value={formData.command}
                            onChange={handleChange('command')}
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                            placeholder="e.g., npx"
                            required={formData.type === 'stdio'}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Arguments (space-separated)
                        </label>
                        <input
                            type="text"
                            value={formData.args}
                            onChange={handleChange('args')}
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                            placeholder="e.g., @modelcontextprotocol/server-filesystem /path/to/dir"
                        />
                    </div>
                </>
            )}

            {(formData.type === 'http' || formData.type === 'ws') && (
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Server URL</label>
                    <input
                        type="text"
                        value={formData.url}
                        onChange={handleChange('url')}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        placeholder={formData.type === 'http' ? 'https://example.com/mcp' : 'wss://example.com/mcp'}
                        required
                    />
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Environment Variables (JSON)</label>
                <textarea
                    value={formData.env}
                    onChange={handleChange('env')}
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder='{"API_KEY": "value", ...}'
                />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
                <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={handleChange('enabled')}
                    className="w-4 h-4 rounded"
                />
                <span className="text-sm text-gray-300">Enable this server</span>
            </label>

            <div className="flex justify-end gap-3 pt-2">
                <button
                    type="button"
                    onClick={props.onCancel}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 rounded-lg text-sm font-medium transition-colors"
                >
                    {saving ? 'Saving...' : props.server ? 'Update' : 'Add'}
                </button>
            </div>
        </form>
    );
}

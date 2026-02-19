/**
 * AgentForm 组件 - 创建/编辑表单
 */

import { useState, useEffect } from 'react';
import type { Agent, Model, Prompt, Tool, Middleware } from '../../../types/index.js';
import { trpc } from '../../../api.js';
import { Select } from '../../ui/Select.js';

interface AgentFormProps {
    agent: Agent | null;
    onSave: (formData: any) => Promise<void>;
    onCancel: () => void;
}

export function AgentForm(props: AgentFormProps) {
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        description: '',
        system_prompt: '',
        model: '',
        tools: {} as Record<string, boolean>,
        middleware: {} as Record<string, boolean>,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 使用 tRPC hooks 获取选项数据
    const { data: models = [], isLoading: loadingModels } = trpc.models.list.useQuery();
    const { data: prompts = [], isLoading: loadingPrompts } = trpc.prompts.list.useQuery();
    const { data: tools = [], isLoading: loadingTools } = trpc.tools.list.useQuery();
    const { data: middlewares = [], isLoading: loadingMiddlewares } = trpc.middlewares.list.useQuery();

    const optionsLoaded = !loadingModels && !loadingPrompts && !loadingTools && !loadingMiddlewares;

    // Initialize form data when options are loaded or agent prop changes
    useEffect(() => {
        if (!optionsLoaded) return;

        if (props.agent) {
            setFormData({
                id: props.agent.id,
                name: props.agent.name,
                description: props.agent.description || '',
                system_prompt: props.agent.system_prompt || '',
                model: props.agent.model || '',
                tools: { ...props.agent.tools } || {},
                middleware: { ...props.agent.middlewares } || {},
            });
        } else {
            // Default: select all tools and middlewares
            const defaultTools: Record<string, boolean> = {};
            const defaultMiddleware: Record<string, boolean> = {};
            tools.forEach((tool) => (defaultTools[tool.id] = true));
            middlewares.forEach((mid) => (defaultMiddleware[mid.id] = true));

            setFormData({
                id: '',
                name: '',
                description: '',
                system_prompt: '',
                model: '',
                tools: defaultTools,
                middleware: defaultMiddleware,
            });
        }
    }, [props.agent, optionsLoaded, tools, middlewares]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            await props.onSave(formData);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const toggleTool = (toolId: string) => {
        setFormData((prev) => {
            const newTools = { ...prev.tools };
            if (newTools[toolId]) {
                delete newTools[toolId];
            } else {
                newTools[toolId] = true;
            }
            return { ...prev, tools: newTools };
        });
    };

    const toggleMiddleware = (midId: string) => {
        setFormData((prev) => {
            const newMiddleware = { ...prev.middleware };
            if (newMiddleware[midId]) {
                delete newMiddleware[midId];
            } else {
                newMiddleware[midId] = true;
            }
            return { ...prev, middleware: newMiddleware };
        });
    };

    // Check if model ID exists in options
    const isValidModel = models.some((m) => m.id === formData.model);

    // Check if prompt ID exists in options
    const isValidPrompt = prompts.some((p) => p.id === formData.system_prompt);

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 text-red-400 text-sm">{error}</div>
            )}

            <div>
                <label className="block text-sm font-medium mb-1">ID</label>
                <input
                    type="text"
                    value={formData.id}
                    onChange={(e) => setFormData((prev) => ({ ...prev, id: e.target.value }))}
                    disabled={!!props.agent}
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    placeholder="e.g., agent-coder"
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.currentTarget.value }))}
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Code Assistant"
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe what this agent does"
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <Select
                    value={formData.model}
                    onChange={(value) => setFormData((prev) => ({ ...prev, model: value }))}
                    options={[
                        { value: '', label: 'Select a model...' },
                        ...models.map((m) => ({ value: m.id, label: `${m.model_name} (${m.id})` })),
                    ]}
                    loading={!optionsLoaded}
                    loadingText="Loading models..."
                    placeholder="Select a model..."
                />
                {formData.model && !isValidModel && (
                    <p className="text-yellow-500 text-xs mt-1">Selected model not found in options</p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">System Prompt</label>
                <Select
                    value={formData.system_prompt}
                    onChange={(value) => setFormData((prev) => ({ ...prev, system_prompt: value }))}
                    options={[
                        { value: '', label: 'Select a prompt...' },
                        ...prompts.map((p) => ({ value: p.id, label: `${p.name} (${p.id})` })),
                    ]}
                    loading={!optionsLoaded}
                    loadingText="Loading prompts..."
                    placeholder="Select a prompt..."
                />
                {formData.system_prompt && !isValidPrompt && (
                    <p className="text-yellow-500 text-xs mt-1">Selected prompt not found in options</p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Tools</label>
                {!optionsLoaded || !tools ? (
                    <div className="max-h-48 overflow-y-auto bg-gray-900 rounded-lg p-3 text-gray-400">
                        Loading tools...
                    </div>
                ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto bg-gray-900 rounded-lg p-3">
                        {tools.length === 0 ? (
                            <p className="text-gray-500 text-sm">No tools available</p>
                        ) : (
                            tools.map((tool) => (
                                <label key={tool.id} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={!!formData.tools[tool.id]}
                                        onChange={() => toggleTool(tool.id)}
                                        className="w-4 h-4 bg-gray-700 border-gray-600 rounded"
                                    />
                                    <span className="text-sm">
                                        {tool.name} <span className="text-gray-500">({tool.id})</span>
                                    </span>
                                </label>
                            ))
                        )}
                    </div>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Middlewares</label>
                {!optionsLoaded ? (
                    <div className="max-h-48 overflow-y-auto bg-gray-900 rounded-lg p-3 text-gray-400">
                        Loading middlewares...
                    </div>
                ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto bg-gray-900 rounded-lg p-3">
                        {middlewares.length === 0 ? (
                            <p className="text-gray-500 text-sm">No middlewares available</p>
                        ) : (
                            middlewares.map((mid) => (
                                <label key={mid.id} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={!!formData.middleware[mid.id]}
                                        onChange={() => toggleMiddleware(mid.id)}
                                        className="w-4 h-4 bg-gray-700 border-gray-600 rounded"
                                    />
                                    <span className="text-sm">
                                        {mid.name} <span className="text-gray-500">({mid.id})</span>
                                    </span>
                                </label>
                            ))
                        )}
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <button
                    type="button"
                    onClick={props.onCancel}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={saving || !optionsLoaded}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                >
                    {saving ? 'Saving...' : 'Save'}
                </button>
            </div>
        </form>
    );
}

/**
 * ModelForm 组件 - 创建/编辑表单
 */

import { useState, useEffect } from 'react';
import type { Model } from '../../../types/index.js';

interface ModelFormProps {
    model: Model | null;
    onSave: (formData: any) => Promise<void>;
    onCancel: () => void;
}

export function ModelForm(props: ModelFormProps) {
    const [formData, setFormData] = useState({
        id: '',
        model_name: '',
        model_provider: '',
        stream_usage: false,
        enable_thinking: false,
        temperature: '',
        max_tokens: '',
        top_p: '',
        frequency_penalty: '',
        presence_penalty: '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (props.model) {
            setFormData({
                id: props.model.id,
                model_name: props.model.model_name,
                model_provider: props.model.model_provider,
                stream_usage: props.model.stream_usage,
                enable_thinking: props.model.enable_thinking,
                temperature: props.model.temperature,
                max_tokens: props.model.max_tokens,
                top_p: props.model.top_p,
                frequency_penalty: props.model.frequency_penalty,
                presence_penalty: props.model.presence_penalty,
            });
        } else {
            setFormData({
                id: '',
                model_name: '',
                model_provider: '',
                stream_usage: false,
                enable_thinking: false,
                temperature: '',
                max_tokens: '',
                top_p: '',
                frequency_penalty: '',
                presence_penalty: '',
            });
        }
    }, [props.model]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            await props.onSave(formData);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleChange =
        (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
            const value =
                e.target.type === 'checkbox'
                    ? (e.target as HTMLInputElement).checked
                    : e.target.type === 'number'
                      ? e.target.value === ''
                          ? ''
                          : parseFloat(e.target.value)
                      : e.target.value;
            setFormData({ ...formData, [field]: value });
        };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 text-red-300 text-sm">{error}</div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Model ID</label>
                <input
                    type="text"
                    value={formData.id}
                    onChange={handleChange('id')}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., gpt-4"
                    disabled={!!props.model}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Model Name</label>
                <input
                    type="text"
                    value={formData.model_name}
                    onChange={handleChange('model_name')}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., GPT-4"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Provider</label>
                <select
                    value={formData.model_provider}
                    onChange={handleChange('model_provider')}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                >
                    <option value="">Select provider</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="google">Google</option>
                </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Temperature</label>
                    <input
                        type="number"
                        min="0"
                        max="2"
                        step="0.1"
                        value={formData.temperature}
                        onChange={handleChange('temperature')}
                        placeholder="Optional"
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Max Tokens</label>
                    <input
                        type="number"
                        min="1"
                        value={formData.max_tokens}
                        onChange={handleChange('max_tokens')}
                        placeholder="Optional"
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Top P</label>
                    <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={formData.top_p}
                        onChange={handleChange('top_p')}
                        placeholder="Optional"
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Frequency Penalty</label>
                    <input
                        type="number"
                        min="-2"
                        max="2"
                        step="0.1"
                        value={formData.frequency_penalty}
                        onChange={handleChange('frequency_penalty')}
                        placeholder="Optional"
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Presence Penalty</label>
                <input
                    type="number"
                    min="-2"
                    max="2"
                    step="0.1"
                    value={formData.presence_penalty}
                    onChange={handleChange('presence_penalty')}
                    placeholder="Optional"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={formData.stream_usage}
                        onChange={handleChange('stream_usage')}
                        className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-gray-300">Stream Usage</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={formData.enable_thinking}
                        onChange={handleChange('enable_thinking')}
                        className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-gray-300">Enable Thinking</span>
                </label>
            </div>

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
                    {saving ? 'Saving...' : props.model ? 'Update' : 'Create'}
                </button>
            </div>
        </form>
    );
}

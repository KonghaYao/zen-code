/**
 * PromptForm 组件 - 创建/编辑表单
 */

import { useState, useEffect } from 'react';
import type { Prompt } from '../../../types/index.js';

interface PromptFormProps {
    prompt: Prompt | null;
    onSave: (formData: any) => Promise<void>;
    onCancel: () => void;
}

export function PromptForm(props: PromptFormProps) {
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        description: '',
        content: '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (props.prompt) {
            setFormData({
                id: props.prompt.id,
                name: props.prompt.name,
                description: props.prompt.description || '',
                content: props.prompt.content,
            });
        } else {
            setFormData({
                id: '',
                name: '',
                description: '',
                content: '',
            });
        }
    }, [props.prompt]);

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
        (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setFormData({ ...formData, [field]: e.target.value });
        };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 text-red-300 text-sm">{error}</div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Prompt ID</label>
                <input
                    type="text"
                    value={formData.id}
                    onChange={handleChange('id')}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., my_prompt"
                    disabled={!!props.prompt}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Prompt Name</label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={handleChange('name')}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., My Prompt"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                    value={formData.description}
                    onChange={handleChange('description')}
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief description of this prompt..."
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Content</label>
                <textarea
                    value={formData.content}
                    onChange={handleChange('content')}
                    rows={12}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="Enter your prompt content here..."
                    required
                />
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
                    {saving ? 'Saving...' : props.prompt ? 'Update' : 'Create'}
                </button>
            </div>
        </form>
    );
}

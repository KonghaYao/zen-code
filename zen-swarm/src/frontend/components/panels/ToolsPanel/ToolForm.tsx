/**
 * ToolForm 组件 - 创建/编辑表单
 */

import { useState, useEffect } from 'react';
import type { Tool } from '../../../types/index.js';

interface ToolFormProps {
    tool: Tool | null;
    onSave: (formData: any) => Promise<void>;
    onCancel: () => void;
}

export function ToolForm(props: ToolFormProps) {
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        description: '',
        parameters: '',
        schema: '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (props.tool) {
            setFormData({
                id: props.tool.id,
                name: props.tool.name,
                description: props.tool.description || '',
                parameters: props.tool.parameters || '',
                schema:
                    typeof props.tool.schema === 'string'
                        ? props.tool.schema
                        : JSON.stringify(props.tool.schema, null, 2),
            });
        } else {
            setFormData({
                id: '',
                name: '',
                description: '',
                parameters: '',
                schema: '',
            });
        }
    }, [props.tool]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            // Validate schema JSON
            let schemaObj = null;
            if (formData.schema.trim()) {
                schemaObj = JSON.parse(formData.schema);
            }

            const data = {
                id: formData.id,
                name: formData.name,
                description: formData.description,
                parameters: formData.parameters,
                schema: schemaObj,
            };

            await props.onSave(data);
        } catch (e: any) {
            if (e instanceof SyntaxError) {
                setError('Invalid JSON in schema field');
            } else {
                setError(e.message);
            }
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
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">{error}</div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tool ID</label>
                <input
                    type="text"
                    value={formData.id}
                    onChange={handleChange('id')}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., my_tool"
                    disabled={!!props.tool}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tool Name</label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={handleChange('name')}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., My Tool"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                    value={formData.description}
                    onChange={handleChange('description')}
                    rows={3}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tool description..."
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parameters (JSON)</label>
                <textarea
                    value={formData.parameters}
                    onChange={handleChange('parameters')}
                    rows={3}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder='{"type": "object", "properties": {...}}'
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Schema (JSON)</label>
                <textarea
                    value={formData.schema}
                    onChange={handleChange('schema')}
                    rows={6}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder='{"type": "object", "properties": {...}}'
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
                    {saving ? 'Saving...' : props.tool ? 'Update' : 'Create'}
                </button>
            </div>
        </form>
    );
}

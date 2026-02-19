/**
 * MiddlewareForm 组件 - 创建/编辑表单
 */

import { useState, useEffect } from 'react';
import type { Middleware } from '../../../types/index.js';

interface MiddlewareFormProps {
    middleware: Middleware | null;
    onSave: (formData: any) => Promise<void>;
    onCancel: () => void;
}

export function MiddlewareForm(props: MiddlewareFormProps) {
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        description: '',
        priority: 50,
        config: '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (props.middleware) {
            setFormData({
                id: props.middleware.id,
                name: props.middleware.name,
                description: props.middleware.description || '',
                priority: props.middleware.priority,
                config:
                    typeof props.middleware.config === 'string'
                        ? props.middleware.config
                        : JSON.stringify(props.middleware.config, null, 2),
            });
        } else {
            setFormData({
                id: '',
                name: '',
                description: '',
                priority: 50,
                config: '',
            });
        }
    }, [props.middleware]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            // Validate config JSON
            let configObj = {};
            if (formData.config.trim()) {
                configObj = JSON.parse(formData.config);
            }

            const data = {
                id: formData.id,
                name: formData.name,
                description: formData.description,
                priority: formData.priority,
                config: configObj,
            };

            await props.onSave(data);
        } catch (e: any) {
            if (e instanceof SyntaxError) {
                setError('Invalid JSON in config field');
            } else {
                setError(e.message);
            }
        } finally {
            setSaving(false);
        }
    };

    const handleChange =
        (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            const value = field === 'priority' ? parseInt(e.target.value, 10) : e.target.value;
            setFormData({ ...formData, [field]: value });
        };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">{error}</div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Middleware ID</label>
                <input
                    type="text"
                    value={formData.id}
                    onChange={handleChange('id')}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., my_middleware"
                    disabled={!!props.middleware}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Middleware Name</label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={handleChange('name')}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., My Middleware"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                    value={formData.description}
                    onChange={handleChange('description')}
                    rows={2}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Middleware description..."
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority ({formData.priority})</label>
                <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={formData.priority}
                    onChange={handleChange('priority')}
                    className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Higher Priority (0)</span>
                    <span>Normal (50)</span>
                    <span>Lower Priority (100)</span>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Config (JSON)</label>
                <textarea
                    value={formData.config}
                    onChange={handleChange('config')}
                    rows={6}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder='{"key": "value", ...}'
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
                    {saving ? 'Saving...' : props.middleware ? 'Update' : 'Create'}
                </button>
            </div>
        </form>
    );
}

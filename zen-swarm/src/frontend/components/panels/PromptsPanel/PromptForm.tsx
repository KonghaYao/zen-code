/**
 * PromptForm 组件 - 创建/编辑/新建版本表单
 */

import { useState, useEffect } from 'react';
import type { Prompt } from '../../../types/index.js';

export type FormMode = 'create' | 'edit' | 'newVersion';

interface PromptFormProps {
    prompt: Prompt | null;
    mode: FormMode;
    onSave: (formData: any) => Promise<void>;
    onCancel: () => void;
}

export function PromptForm(props: PromptFormProps) {
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        content: '',
        change_note: '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (props.prompt) {
            setFormData({
                id: props.prompt.id,
                name: props.prompt.name,
                content: props.prompt.content,
                change_note: '',
            });
        } else {
            setFormData({
                id: '',
                name: '',
                content: '',
                change_note: '',
            });
        }
    }, [props.prompt, props.mode]);

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

    const getTitle = () => {
        switch (props.mode) {
            case 'create':
                return 'Create Prompt';
            case 'edit':
                return 'Edit Prompt';
            case 'newVersion':
                return 'Create New Version';
        }
    };

    const getSubmitLabel = () => {
        switch (props.mode) {
            case 'create':
                return 'Create';
            case 'edit':
                return 'Update';
            case 'newVersion':
                return 'Create Version';
        }
    };

    const isNewVersion = props.mode === 'newVersion';
    const isEdit = props.mode === 'edit';
    const isCreate = props.mode === 'create';

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 text-red-300 text-sm">{error}</div>
            )}

            {/* 新建版本时显示当前版本信息 */}
            {isNewVersion && props.prompt && (
                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3 text-blue-300 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="font-medium">{props.prompt.name}</span>
                        <span className="px-1.5 py-0.5 bg-blue-600/40 text-xs rounded font-mono">
                            v{props.prompt.current_version}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="px-1.5 py-0.5 bg-green-600/40 text-xs rounded font-mono">
                            v{props.prompt.current_version + 1}
                        </span>
                    </div>
                </div>
            )}

            {/* ID 字段 */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Prompt ID</label>
                <input
                    type="text"
                    value={formData.id}
                    onChange={handleChange('id')}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., my_prompt"
                    disabled={!isCreate}
                />
            </div>

            {/* Name 字段 */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Prompt Name</label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={handleChange('name')}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., My Prompt"
                    required={isCreate}
                    disabled={isNewVersion}
                />
            </div>

            {/* Change Note 字段 - 新建版本时必填 */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                    Change Note {isNewVersion && <span className="text-red-400">*</span>}
                </label>
                <input
                    type="text"
                    value={formData.change_note}
                    onChange={handleChange('change_note')}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={
                        isNewVersion ? 'Describe what changed in this version...' : 'Optional note for this change'
                    }
                    required={isNewVersion}
                />
            </div>

            {/* Content 字段 */}
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
                    {saving ? 'Saving...' : getSubmitLabel()}
                </button>
            </div>
        </form>
    );
}

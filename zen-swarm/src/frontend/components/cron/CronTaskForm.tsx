/**
 * CronTaskForm 组件 - Cron 任务创建/编辑表单
 */

import { useState, useEffect } from 'react';
import { trpc } from '../../api.js';
import type { CronTask, CronTaskInput } from '../../types/cron.js';
import { CronExpressionInput } from './CronExpressionInput.js';
import { VariablesEditor } from './VariablesEditor.js';

interface CronTaskFormProps {
    task?: CronTask | null; // 如果提供，则为编辑模式
    onSave: () => void;
    onCancel: () => void;
}

export function CronTaskForm(props: CronTaskFormProps) {
    const { task, onSave, onCancel } = props;
    const isEdit = !!task;

    // 表单状态
    const [formData, setFormData] = useState<CronTaskInput>({
        id: '',
        name: '',
        description: '',
        cron_expression: '0 9 * * *',
        prompt: '',
        agent_id: '',
        enabled: true,
        max_retries: 0,
        variables: {},
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // 获取 agents 列表
    const { data: agents } = trpc.agents.list.useQuery();

    // 初始化表单数据（编辑模式）
    useEffect(() => {
        if (task) {
            setFormData({
                id: task.id,
                name: task.name,
                description: task.description || '',
                cron_expression: task.cron_expression,
                prompt: task.prompt,
                agent_id: task.agent_id,
                enabled: task.enabled,
                max_retries: task.max_retries,
                variables: task.variables || {},
            });
        } else {
            // 新建模式，生成 ID
            setFormData((prev) => ({
                ...prev,
                id: `cron-${Date.now()}`,
            }));
        }
    }, [task]);

    // Mutations
    const createMutation = trpc.cron.createTask.useMutation({
        onSuccess: () => {
            onSave();
        },
        onError: (error) => {
            setErrors({ submit: error.message });
        },
    });

    const updateMutation = trpc.cron.updateTask.useMutation({
        onSuccess: () => {
            onSave();
        },
        onError: (error) => {
            setErrors({ submit: error.message });
        },
    });

    // 更新字段
    const updateField = <K extends keyof CronTaskInput>(field: K, value: CronTaskInput[K]) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        // 清除该字段的错误
        if (errors[field]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    // 验证表单
    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        }

        if (!formData.cron_expression.trim()) {
            newErrors.cron_expression = 'Cron expression is required';
        } else if (formData.cron_expression.split(/\s+/).length !== 5) {
            newErrors.cron_expression = 'Invalid cron expression format';
        }

        if (!formData.prompt.trim()) {
            newErrors.prompt = 'Prompt is required';
        }

        if (!formData.agent_id) {
            newErrors.agent_id = 'Agent is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // 提交表单
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        if (isEdit) {
            updateMutation.mutate({
                id: formData.id,
                name: formData.name,
                description: formData.description,
                cron_expression: formData.cron_expression,
                prompt: formData.prompt,
                agent_id: formData.agent_id,
                enabled: formData.enabled,
                max_retries: formData.max_retries,
                variables: formData.variables || {},
            });
        } else {
            createMutation.mutate(formData);
        }
    };

    const isLoading = createMutation.isPending || updateMutation.isPending;

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="Daily report task"
                    className={`w-full px-3 py-2 border rounded-lg ${
                        errors.name ? 'border-red-300' : 'border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="Optional description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Cron Expression */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cron Expression <span className="text-red-500">*</span>
                </label>
                <CronExpressionInput
                    value={formData.cron_expression}
                    onChange={(value) => updateField('cron_expression', value)}
                    error={errors.cron_expression}
                />
            </div>

            {/* Agent */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agent <span className="text-red-500">*</span>
                </label>
                <select
                    value={formData.agent_id}
                    onChange={(e) => updateField('agent_id', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg ${
                        errors.agent_id ? 'border-red-300' : 'border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                    <option value="">Select an agent...</option>
                    {agents?.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                            {agent.name} ({agent.id})
                        </option>
                    ))}
                </select>
                {errors.agent_id && <p className="mt-1 text-sm text-red-600">{errors.agent_id}</p>}
            </div>

            {/* Prompt */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prompt <span className="text-red-500">*</span>
                </label>
                <textarea
                    value={formData.prompt}
                    onChange={(e) => updateField('prompt', e.target.value)}
                    placeholder="Enter the task prompt. Use {{variable}} for variables."
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-lg font-mono text-sm ${
                        errors.prompt ? 'border-red-300' : 'border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                {errors.prompt && <p className="mt-1 text-sm text-red-600">{errors.prompt}</p>}
            </div>

            {/* Variables */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Variables</label>
                <VariablesEditor
                    value={formData.variables || {}}
                    onChange={(value) => updateField('variables', value)}
                />
            </div>

            {/* Options */}
            <div className="flex gap-6">
                {/* Enabled */}
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={formData.enabled}
                        onChange={(e) => updateField('enabled', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Enabled</span>
                </label>

                {/* Max Retries */}
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-700">Max Retries:</label>
                    <input
                        type="number"
                        min="0"
                        max="10"
                        value={formData.max_retries}
                        onChange={(e) => updateField('max_retries', parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Submit Error */}
            {errors.submit && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{errors.submit}</p>
                </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className={`px-4 py-2 text-sm text-white rounded-lg ${
                        isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                >
                    {isLoading ? 'Saving...' : isEdit ? 'Update Task' : 'Create Task'}
                </button>
            </div>
        </form>
    );
}

/**
 * CronTaskForm 组件 - Cron 任务创建/编辑表单
 */

import { useState, useEffect } from 'react';
import { trpc } from '../../api.js';
import type { CronTask, CronTaskInput } from '../../types/cron.js';
import { CronExpressionInput } from './CronExpressionInput.js';
import { VariablesEditor } from './VariablesEditor.js';
import { validateCronExpression } from '../../../cron/validation.js';

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
        initial_state: {},
        enabled: true,
        max_retries: 0,
        variables: {},
    });

    // 本地 workspace 选择状态（用于 UI 控件，实际数据存在 initial_state.cwd）
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');

    const [errors, setErrors] = useState<Record<string, string>>({});

    // 获取 agents 列表
    const { data: agents } = trpc.agents.list.useQuery();

    // 获取 models 列表
    const { data: models } = trpc.models.list.useQuery();

    // 获取 workspaces 列表
    const { data: workspacesData } = trpc.workspaces.getAll.useQuery();
    const workspaces = workspacesData?.workspaces ?? [];

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
                initial_state: task.initial_state || {},
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

    // 编辑模式：从 initial_state.cwd 反推已选 workspace
    // 仅在 workspaces 首次加载完成后执行一次，避免 refetch 后重置用户的选择
    useEffect(() => {
        if (selectedWorkspaceId) return; // 已经有选中项，不再反推
        const cwd = task?.initial_state?.cwd;
        if (cwd && workspaces.length > 0) {
            const ws = workspaces.find((w) => w.rootPath === cwd);
            if (ws) setSelectedWorkspaceId(ws.id);
        }
    }, [task?.initial_state?.cwd, workspaces]);

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

    // Agent 变化时同步到 initial_state
    const handleAgentChange = (agentId: string) => {
        setFormData((prev) => ({
            ...prev,
            agent_id: agentId,
            initial_state: {
                ...prev.initial_state,
                agent_id: agentId,
            },
        }));
        if (errors.agent_id) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next.agent_id;
                return next;
            });
        }
    };

    // Model 变化时同步到 initial_state
    const handleModelChange = (modelId: string) => {
        setFormData((prev) => {
            // 清空时从对象中删除 key，而非设为 undefined（避免残留 key 引起误解）
            const { model_id: _removed, ...restState } = prev.initial_state ?? {};
            return {
                ...prev,
                initial_state: modelId ? { ...restState, model_id: modelId } : restState,
            };
        });
    };

    // Workspace 变化时同步 cwd 到 initial_state
    const handleWorkspaceChange = (workspaceId: string) => {
        setSelectedWorkspaceId(workspaceId);
        const ws = workspaces.find((w) => w.id === workspaceId);
        if (ws) {
            setFormData((prev) => ({
                ...prev,
                initial_state: {
                    ...prev.initial_state,
                    cwd: ws.rootPath,
                },
            }));
        }
        if (errors.workspace) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next.workspace;
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

        // 使用统一的验证函数
        const cronValidation = validateCronExpression(formData.cron_expression);
        if (!cronValidation.valid) {
            newErrors.cron_expression = cronValidation.error || 'Invalid cron expression';
        }

        if (!formData.prompt.trim()) {
            newErrors.prompt = 'Prompt is required';
        }

        if (!formData.agent_id) {
            newErrors.agent_id = 'Agent is required';
        }

        // 校验 workspace（通过 initial_state.cwd 判断）
        if (!formData.initial_state?.cwd) {
            newErrors.workspace = 'Workspace is required';
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
                initial_state: formData.initial_state,
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

            {/* Agent + Model + Workspace 并排 */}
            <div className="grid grid-cols-3 gap-4">
                {/* Agent */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Agent <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={formData.agent_id}
                        onChange={(e) => handleAgentChange(e.target.value)}
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

                {/* Model */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Model
                        <span className="ml-1 text-xs text-gray-400 font-normal">(optional, uses agent default)</span>
                    </label>
                    <select
                        value={(formData.initial_state?.model_id as string | undefined) ?? ''}
                        onChange={(e) => handleModelChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Agent default</option>
                        {models?.map((model) => (
                            <option key={model.id} value={model.id}>
                                {model.name || model.model_name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Workspace */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Workspace <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={selectedWorkspaceId}
                        onChange={(e) => handleWorkspaceChange(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg ${
                            errors.workspace ? 'border-red-300' : 'border-gray-300'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                        <option value="">Select a workspace...</option>
                        {workspaces.map((ws) => (
                            <option key={ws.id} value={ws.id}>
                                {ws.name} ({ws.rootPath})
                            </option>
                        ))}
                    </select>
                    {errors.workspace && <p className="mt-1 text-sm text-red-600">{errors.workspace}</p>}
                </div>
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

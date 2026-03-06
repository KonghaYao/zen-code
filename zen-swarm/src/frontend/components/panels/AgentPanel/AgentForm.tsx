/**
 * AgentForm 组件 - macOS 原生风格
 *
 * 设计特点：
 * - 流式分组布局（基本信息 / 配置 / 能力）
 * - 卡片点击选择工具和中间件
 * - 优雅的分组标题和分隔
 */

import { useState, useEffect, useMemo } from 'react';
import type { Agent, Model, Prompt, Middleware } from '../../../types/index.js';
import { Select } from '../../ui/Select.js';
import { Check, Settings2, Wrench, FileText } from 'lucide-react';

interface AgentFormProps {
    agent: Agent | null;
    models: Model[];
    prompts: Prompt[];
    middlewares: Middleware[];
    onSave: (formData: any) => Promise<void>;
    onCancel: () => void;
}

// 初始表单状态
const createInitialFormData = (agent: Agent | null) => ({
    id: agent?.id ?? '',
    name: agent?.name ?? '',
    description: agent?.description ?? '',
    system_prompt: agent?.system_prompt ?? '',
    model: agent?.model ?? '',
    middlewares: { ...(agent?.middlewares || {}) } as Record<string, boolean>,
});

export function AgentForm(props: AgentFormProps) {
    const [formData, setFormData] = useState(() => createInitialFormData(props.agent));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    const { models, prompts, middlewares } = props;
    const optionsLoaded = models.length > 0;

    // 初始化表单数据
    useEffect(() => {
        if (props.agent) {
            setFormData(createInitialFormData(props.agent));
        } else {
            setFormData({
                id: '',
                name: '',
                description: '',
                system_prompt: '',
                model: '',
                middlewares: {},
            });
        }
    }, [props.agent]);

    // 初始化默认选中所有中间件（创建模式）
    useEffect(() => {
        if (!props.agent && optionsLoaded) {
            setFormData((prev) => ({
                ...prev,
                middlewares: Object.fromEntries(middlewares.map((m) => [m.id, true])),
            }));
        }
    }, [optionsLoaded, middlewares, props.agent]);

    // 计算选中数量
    const selectedMiddlewaresCount = useMemo(
        () => Object.keys(formData.middlewares).filter((k) => formData.middlewares[k]).length,
        [formData.middlewares],
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // 验证
        const errors: Record<string, string> = {};
        if (!formData.id.trim()) errors.id = 'ID 不能为空';
        if (!formData.name.trim()) errors.name = '名称不能为空';
        if (!formData.model) errors.model = '请选择模型';
        if (!formData.system_prompt) errors.system_prompt = '请选择系统提示词';

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }

        setSaving(true);
        try {
            await props.onSave(formData);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const toggleMiddleware = (midId: string) => {
        setFormData((prev) => ({
            ...prev,
            middlewares: { ...prev.middlewares, [midId]: !prev.middlewares[midId] },
        }));
    };

    const updateField = (field: string, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (validationErrors[field]) {
            setValidationErrors((prev) => ({ ...prev, [field]: '' }));
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
            {/* 错误提示 */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm animate-fade-in">
                    {error}
                </div>
            )}

            {/* 流式内容区 */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-8 pr-1">
                {/* ========== 基本信息 ========== */}
                <Section title="基本信息" icon={<FileText className="w-4 h-4" />}>
                    <div className="space-y-4">
                        <FormField label="Agent ID" required error={validationErrors.id}>
                            <input
                                type="text"
                                value={formData.id}
                                onChange={(e) => updateField('id', e.target.value)}
                                disabled={!!props.agent}
                                placeholder="例如: code-assistant"
                                className="form-input-macos"
                            />
                            <p className="mt-1.5 text-xs text-neutral-400">唯一标识符，创建后不可修改</p>
                        </FormField>

                        <FormField label="显示名称" required error={validationErrors.name}>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => updateField('name', e.target.value)}
                                placeholder="例如: 代码助手"
                                className="form-input-macos"
                            />
                        </FormField>

                        <FormField label="描述">
                            <textarea
                                value={formData.description}
                                onChange={(e) => updateField('description', e.target.value)}
                                placeholder="描述这个 Agent 的功能..."
                                rows={2}
                                className="form-input-macos resize-none"
                            />
                        </FormField>
                    </div>
                </Section>

                {/* ========== 配置 ========== */}
                <Section title="配置" icon={<Settings2 className="w-4 h-4" />}>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="模型" required error={validationErrors.model}>
                            <Select
                                value={formData.model}
                                onChange={(value) => updateField('model', value)}
                                options={[
                                    { value: '', label: '选择模型...' },
                                    ...models.map((m) => ({ value: m.id, label: `${m.model_name} (${m.id})` })),
                                ]}
                                loading={!optionsLoaded}
                                loadingText="加载中..."
                                placeholder="选择模型"
                            />
                        </FormField>

                        <FormField label="系统提示词" required error={validationErrors.system_prompt}>
                            <Select
                                value={formData.system_prompt}
                                onChange={(value) => updateField('system_prompt', value)}
                                options={[
                                    { value: '', label: '选择提示词...' },
                                    ...prompts.map((p) => ({ value: p.id, label: `${p.name} (${p.id})` })),
                                ]}
                                loading={!optionsLoaded}
                                loadingText="加载中..."
                                placeholder="选择提示词"
                            />
                        </FormField>
                    </div>
                </Section>

                {/* ========== 能力 ========== */}
                <Section
                    title="能力"
                    icon={<Wrench className="w-4 h-4" />}
                    badge={`${selectedMiddlewaresCount} 项已启用`}
                >
                    {/* 中间件选择 */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium text-neutral-700">中间件</h4>
                            <span className="text-xs text-neutral-400 tabular-nums">
                                {selectedMiddlewaresCount} / {middlewares.length}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {middlewares.map((mid) => (
                                <CapabilityCard
                                    key={mid.id}
                                    id={mid.id}
                                    name={mid.name}
                                    description={mid.description}
                                    selected={!!formData.middlewares[mid.id]}
                                    onClick={() => toggleMiddleware(mid.id)}
                                />
                            ))}
                        </div>
                    </div>
                </Section>
            </div>

            {/* 底部按钮栏 */}
            <div className="flex items-center justify-between pt-5 mt-6 border-t border-neutral-100">
                <div className="text-xs text-neutral-400">{props.agent ? '编辑 Agent' : '创建新 Agent'}</div>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={props.onCancel}
                        className="btn-ghost px-4 py-2 text-sm font-medium rounded-lg"
                    >
                        取消
                    </button>
                    <button
                        type="submit"
                        disabled={saving || !optionsLoaded}
                        className="btn-primary px-5 py-2 text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <span className="flex items-center gap-2">
                                <span className="loading-spinner w-4 h-4" />
                                保存中...
                            </span>
                        ) : props.agent ? (
                            '保存修改'
                        ) : (
                            '创建 Agent'
                        )}
                    </button>
                </div>
            </div>
        </form>
    );
}

/**
 * 分组区域组件
 */
interface SectionProps {
    title: string;
    icon: React.ReactNode;
    badge?: string;
    children: React.ReactNode;
}

function Section({ title, icon, badge, children }: SectionProps) {
    return (
        <section>
            {/* 分组标题 */}
            <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 flex items-center justify-center rounded-md bg-neutral-100 text-neutral-500">
                    {icon}
                </div>
                <h3 className="text-sm font-semibold text-neutral-800">{title}</h3>
                {badge && (
                    <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-600 rounded-full">
                        {badge}
                    </span>
                )}
            </div>
            {/* 分组内容 */}
            <div className="pl-8">{children}</div>
        </section>
    );
}

/**
 * 表单字段组件
 */
interface FormFieldProps {
    label: string;
    required?: boolean;
    error?: string;
    children: React.ReactNode;
}

function FormField({ label, required, error, children }: FormFieldProps) {
    return (
        <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {children}
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}

/**
 * 能力选择卡片组件
 */
interface CapabilityCardProps {
    id: string;
    name: string;
    description?: string;
    selected: boolean;
    onClick: () => void;
}

function CapabilityCard({ id, name, description, selected, onClick }: CapabilityCardProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`
                relative flex flex-col items-start p-3 rounded-lg border text-left
                transition-all duration-150 ease-out
                ${
                    selected
                        ? 'border-blue-400 bg-blue-50/80 shadow-sm'
                        : 'border-neutral-200/80 bg-white hover:border-neutral-300 hover:bg-neutral-50'
                }
            `}
        >
            {/* 选中指示器 */}
            <div
                className={`
                    absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center
                    transition-all duration-150
                    ${selected ? 'bg-blue-500 text-white scale-100' : 'bg-neutral-100 text-transparent scale-90'}
                `}
            >
                <Check className="w-3 h-3" />
            </div>

            <span className={`text-sm font-medium pr-6 ${selected ? 'text-blue-900' : 'text-neutral-800'}`}>
                {name}
            </span>
            <span className={`text-xs ${selected ? 'text-blue-500' : 'text-neutral-400'}`}>{id}</span>
            {description && (
                <p className={`text-xs mt-1.5 line-clamp-2 ${selected ? 'text-blue-600/80' : 'text-neutral-500'}`}>
                    {description}
                </p>
            )}
        </button>
    );
}

export default AgentForm;

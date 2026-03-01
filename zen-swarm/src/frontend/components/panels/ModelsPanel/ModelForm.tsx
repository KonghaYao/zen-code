/**
 * ModelForm 组件 - 创建/编辑表单
 *
 * 优化点：
 * - 使用通用表单组件（FormField、FormInput、FormSelect 等）减少重复代码
 * - 使用函数式 setState 避免依赖问题（规则：rerender-functional-setstate）
 * - 简化表单状态初始化
 * - Provider 选择器（从 Provider 列表中选择，而非手动输入）
 */

import { useState, useEffect } from 'react';
import type { Model, Provider } from '../../../types/index.js';
import { FormField, FormInput, FormSelect, FormCheckbox } from '../../ui/form/FormField.js';
import { FormButtons } from '../../ui/form/FormButtons.js';

interface ModelFormProps {
    model: Model | null;
    providers: Provider[];
    onSave: (formData: any) => Promise<void>;
    onCancel: () => void;
}

// 初始表单状态（规则：rerender-lazy-state-init）
const createInitialFormData = (model: Model | null) => ({
    id: model?.id ?? '',
    name: model?.name ?? '',
    provider_id: model?.provider_id ?? '',
    model_name: model?.model_name ?? '',
    stream_usage: model?.stream_usage ?? false,
    enable_thinking: model?.enable_thinking ?? false,
    temperature: model?.temperature?.toString() ?? '',
    max_tokens: model?.max_tokens?.toString() ?? '',
    top_p: model?.top_p?.toString() ?? '',
    frequency_penalty: model?.frequency_penalty?.toString() ?? '',
    presence_penalty: model?.presence_penalty?.toString() ?? '',
});

export function ModelForm(props: ModelFormProps) {
    const [formData, setFormData] = useState(() => createInitialFormData(props.model));
    const [errors, setErrors] = useState<Record<string, string>>({});

    // 同步外部 model 变化（规则：rerender-functional-setstate）
    useEffect(() => {
        setFormData(createInitialFormData(props.model));
    }, [props.model]);

    const handleChange = (field: keyof typeof formData) => (value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        // 清除该字段的错误
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: '' }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 基本验证
        const newErrors: Record<string, string> = {};
        if (!formData.model_name) newErrors.model_name = 'Model Name is required';
        if (!formData.provider_id) newErrors.provider_id = 'Provider is required';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        // 转换空字符串为 undefined，让后端使用默认值
        const submissionData = {
            ...formData,
            id: formData.id || undefined,
            name: formData.name || undefined,
            temperature: formData.temperature === '' ? undefined : parseFloat(formData.temperature),
            max_tokens: formData.max_tokens === '' ? undefined : parseInt(formData.max_tokens, 10),
            top_p: formData.top_p === '' ? undefined : parseFloat(formData.top_p),
            frequency_penalty: formData.frequency_penalty === '' ? undefined : parseFloat(formData.frequency_penalty),
            presence_penalty: formData.presence_penalty === '' ? undefined : parseFloat(formData.presence_penalty),
        };

        try {
            await props.onSave(submissionData);
        } catch (e: any) {
            setErrors({ general: e.message });
        }
    };

    const isEditing = !!props.model;

    // 获取选中的 provider 信息
    const selectedProvider = props.providers?.find((p) => p.id === formData.provider_id);

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {errors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">
                    {errors.general}
                </div>
            )}

            <FormField label="Model ID" error={errors.id}>
                <FormInput
                    type="text"
                    value={formData.id}
                    onChange={(e) => handleChange('id')(e.target.value)}
                    placeholder="e.g., gpt-4o"
                    disabled={isEditing}
                    error={!!errors.id}
                />
            </FormField>

            <FormField label="Display Name" error={errors.name}>
                <FormInput
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name')(e.target.value)}
                    placeholder="e.g., GPT-4o"
                    error={!!errors.name}
                />
            </FormField>

            <FormField label="Provider" required error={errors.provider_id}>
                <FormSelect
                    value={formData.provider_id}
                    onChange={(e) => handleChange('provider_id')(e.target.value)}
                    error={!!errors.provider_id}
                >
                    <option value="">Select provider</option>
                    {props.providers?.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                            {provider.name} ({provider.type}){!provider.apiKey ? ' - ⚠️ No API Key' : ''}
                        </option>
                    ))}
                </FormSelect>
                {selectedProvider && !selectedProvider.apiKey && (
                    <p className="text-amber-600 text-xs mt-1">
                        ⚠️ This provider has no API Key configured. Please add your API Key in Provider settings.
                    </p>
                )}
            </FormField>

            <FormField label="Model ID (API)" required error={errors.model_name}>
                <FormInput
                    type="text"
                    value={formData.model_name}
                    onChange={(e) => handleChange('model_name')(e.target.value)}
                    placeholder="e.g., gpt-4o-2024-11-20, claude-3-5-sonnet-20241022"
                    error={!!errors.model_name}
                />
                <p className="text-gray-500 text-xs mt-1">The actual model ID used in API calls</p>
            </FormField>

            <div className="grid grid-cols-2 gap-4">
                <FormField label="Temperature" error={errors.temperature}>
                    <FormInput
                        type="number"
                        min={0}
                        max={2}
                        step={0.1}
                        value={formData.temperature}
                        onChange={(e) => handleChange('temperature')(e.target.value)}
                        placeholder="0.7"
                        error={!!errors.temperature}
                    />
                </FormField>

                <FormField label="Max Tokens" error={errors.max_tokens}>
                    <FormInput
                        type="number"
                        min={1}
                        value={formData.max_tokens}
                        onChange={(e) => handleChange('max_tokens')(e.target.value)}
                        placeholder="4096"
                        error={!!errors.max_tokens}
                    />
                </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <FormField label="Top P" error={errors.top_p}>
                    <FormInput
                        type="number"
                        min={0}
                        max={1}
                        step={0.1}
                        value={formData.top_p}
                        onChange={(e) => handleChange('top_p')(e.target.value)}
                        placeholder="1.0"
                        error={!!errors.top_p}
                    />
                </FormField>

                <FormField label="Frequency Penalty" error={errors.frequency_penalty}>
                    <FormInput
                        type="number"
                        min={-2}
                        max={2}
                        step={0.1}
                        value={formData.frequency_penalty}
                        onChange={(e) => handleChange('frequency_penalty')(e.target.value)}
                        placeholder="0.0"
                        error={!!errors.frequency_penalty}
                    />
                </FormField>
            </div>

            <FormField label="Presence Penalty" error={errors.presence_penalty}>
                <FormInput
                    type="number"
                    min={-2}
                    max={2}
                    step={0.1}
                    value={formData.presence_penalty}
                    onChange={(e) => handleChange('presence_penalty')(e.target.value)}
                    placeholder="0.0"
                    error={!!errors.presence_penalty}
                />
            </FormField>

            <div className="flex items-center gap-4">
                <FormCheckbox
                    id="stream_usage"
                    label="Stream Usage"
                    checked={formData.stream_usage}
                    onChange={(e) => handleChange('stream_usage')(e.target.checked)}
                />

                <FormCheckbox
                    id="enable_thinking"
                    label="Enable Thinking"
                    checked={formData.enable_thinking}
                    onChange={(e) => handleChange('enable_thinking')(e.target.checked)}
                />
            </div>

            <FormButtons onCancel={props.onCancel} isSaving={false} isEditing={isEditing} />
        </form>
    );
}

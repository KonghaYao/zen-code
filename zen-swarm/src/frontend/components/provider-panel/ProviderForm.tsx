/**
 * ProviderForm 组件 - 提供商表单
 */

import { useState, useEffect } from 'react';
import { Eye, EyeOff, AlertCircle, Loader2 } from '../ui/Icons.js';
import { FormField, FormInput, FormSelect, FormCheckbox } from '../ui/form/FormField.js';
import { FormButtons } from '../ui/form/FormButtons.js';
import type { Provider, ProviderFormData, ProviderType } from './types.js';
import { DEFAULT_BASE_URLS } from '../../hooks/useProviders.js';

interface ProviderFormProps {
    provider?: Provider | null; // 编辑模式时传入
    onSubmit: (data: ProviderFormData) => Promise<void>;
    onCancel: () => void;
    isSaving?: boolean;
}

const initialFormData: ProviderFormData = {
    name: '',
    type: 'openai',
    apiKey: '',
    baseUrl: DEFAULT_BASE_URLS.openai,
    isActive: false,
};

export function ProviderForm({ provider, onSubmit, onCancel, isSaving }: ProviderFormProps) {
    const [formData, setFormData] = useState<ProviderFormData>(initialFormData);
    const [showApiKey, setShowApiKey] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const isEditing = !!provider;

    // 初始化表单数据
    useEffect(() => {
        if (provider) {
            setFormData({
                name: provider.name,
                type: provider.type,
                apiKey: '', // 编辑时不显示原始 API Key，需要重新输入
                baseUrl: provider.baseUrl,
                isActive: provider.isActive,
            });
        } else {
            setFormData(initialFormData);
        }
        setErrors({});
    }, [provider]);

    // 当类型改变时，更新默认 Base URL
    const handleTypeChange = (type: ProviderType) => {
        setFormData((prev) => ({
            ...prev,
            type,
            baseUrl: DEFAULT_BASE_URLS[type],
        }));
        setErrors((prev) => ({ ...prev, type: '', baseUrl: '' }));
    };

    // 验证表单
    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = '请输入名称';
        } else if (formData.name.length > 50) {
            newErrors.name = '名称不能超过 50 字符';
        }

        if (!formData.apiKey.trim() && !isEditing) {
            newErrors.apiKey = '请输入 API Key';
        } else if (formData.apiKey && formData.apiKey.length < 10) {
            newErrors.apiKey = 'API Key 长度不足';
        }

        if (!formData.baseUrl.trim()) {
            newErrors.baseUrl = '请输入 Base URL';
        } else {
            try {
                new URL(formData.baseUrl);
            } catch {
                newErrors.baseUrl = '请输入有效的 URL';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // 提交表单
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        await onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* 名称 */}
            <FormField label="名称" required error={errors.name}>
                <FormInput
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                        setFormData((prev) => ({ ...prev, name: e.target.value }));
                        setErrors((prev) => ({ ...prev, name: '' }));
                    }}
                    placeholder="例如: OpenAI Production"
                    error={!!errors.name}
                    disabled={isSaving}
                />
            </FormField>

            {/* 类型 */}
            <FormField label="类型" required error={errors.type}>
                <FormSelect
                    value={formData.type}
                    onChange={(e) => handleTypeChange(e.target.value as ProviderType)}
                    error={!!errors.type}
                    disabled={isSaving}
                >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                </FormSelect>
            </FormField>

            {/* API Key */}
            <FormField label="API Key" required={!isEditing} error={errors.apiKey}>
                <div className="relative">
                    <FormInput
                        type={showApiKey ? 'text' : 'password'}
                        value={formData.apiKey}
                        onChange={(e) => {
                            setFormData((prev) => ({ ...prev, apiKey: e.target.value }));
                            setErrors((prev) => ({ ...prev, apiKey: '' }));
                        }}
                        placeholder={isEditing ? '留空保持不变' : 'sk-...'}
                        error={!!errors.apiKey}
                        disabled={isSaving}
                        className="pr-10"
                    />
                    <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                    >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
                {isEditing && !formData.apiKey && (
                    <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        留空将保持原有 API Key 不变
                    </p>
                )}
            </FormField>

            {/* Base URL */}
            <FormField label="Base URL" required error={errors.baseUrl}>
                <FormInput
                    type="text"
                    value={formData.baseUrl}
                    onChange={(e) => {
                        setFormData((prev) => ({ ...prev, baseUrl: e.target.value }));
                        setErrors((prev) => ({ ...prev, baseUrl: '' }));
                    }}
                    placeholder={DEFAULT_BASE_URLS[formData.type]}
                    error={!!errors.baseUrl}
                    disabled={isSaving}
                />
            </FormField>

            {/* 设为活跃 */}
            <div className="pt-2">
                <FormCheckbox
                    id="isActive"
                    label="设为活跃提供商"
                    checked={formData.isActive}
                    onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                    disabled={isSaving}
                />
            </div>

            {/* 按钮 */}
            <div className="pt-4">
                <FormButtons
                    onCancel={onCancel}
                    isSaving={isSaving}
                    isEditing={isEditing}
                    saveText={isEditing ? '保存' : '创建'}
                    cancelText="取消"
                />
            </div>
        </form>
    );
}

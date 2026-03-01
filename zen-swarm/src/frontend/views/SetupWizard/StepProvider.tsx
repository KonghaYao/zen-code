/**
 * StepProvider - 初始化向导第二步：Provider 配置
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { Eye, EyeOff } from '../../components/ui/Icons.js';
import { FormField, FormInput, FormSelect } from '../../components/ui/form/FormField.js';
import { DEFAULT_BASE_URLS } from '../../hooks/useProviders.js';
import { useCreateProvider } from '../../hooks/useProviders.js';
import type { ProviderType } from '../../hooks/useProviders.js';

interface StepProviderProps {
    onNext: (providerId: string, providerType: ProviderType) => void;
}

export function StepProvider({ onNext }: StepProviderProps) {
    const [formData, setFormData] = useState({
        name: '',
        type: 'openai' as ProviderType,
        apiKey: '',
        baseUrl: DEFAULT_BASE_URLS.openai,
    });
    const [showApiKey, setShowApiKey] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const createProvider = useCreateProvider();

    const handleTypeChange = (type: ProviderType) => {
        setFormData((prev) => ({ ...prev, type, baseUrl: DEFAULT_BASE_URLS[type] }));
        setErrors((prev) => ({ ...prev, type: '', baseUrl: '' }));
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = '请输入名称';
        if (!formData.apiKey.trim()) newErrors.apiKey = '请输入 API Key';
        else if (formData.apiKey.length < 10) newErrors.apiKey = 'API Key 长度不足';
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            const provider = await createProvider.mutateAsync({
                ...formData,
                isActive: true,
            });
            onNext(provider.id, provider.type);
        } catch (err: any) {
            setErrors({ general: err.message ?? '创建失败，请重试' });
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">配置 AI 提供商</h2>
                <p className="text-gray-500 text-sm mt-1">填写你的 API Key 以连接 AI 服务</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {errors.general && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">
                        {errors.general}
                    </div>
                )}

                <FormField label="提供商名称" required error={errors.name}>
                    <FormInput
                        type="text"
                        value={formData.name}
                        onChange={(e) => {
                            setFormData((prev) => ({ ...prev, name: e.target.value }));
                            setErrors((prev) => ({ ...prev, name: '' }));
                        }}
                        placeholder="例如：My OpenAI"
                        error={!!errors.name}
                        disabled={createProvider.isPending}
                    />
                </FormField>

                <FormField label="类型" required error={errors.type}>
                    <FormSelect
                        value={formData.type}
                        onChange={(e) => handleTypeChange(e.target.value as ProviderType)}
                        disabled={createProvider.isPending}
                    >
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic</option>
                    </FormSelect>
                </FormField>

                <FormField label="API Key" required error={errors.apiKey}>
                    <div className="relative">
                        <FormInput
                            type={showApiKey ? 'text' : 'password'}
                            value={formData.apiKey}
                            onChange={(e) => {
                                setFormData((prev) => ({ ...prev, apiKey: e.target.value }));
                                setErrors((prev) => ({ ...prev, apiKey: '' }));
                            }}
                            placeholder={formData.type === 'openai' ? 'sk-...' : 'sk-ant-...'}
                            error={!!errors.apiKey}
                            disabled={createProvider.isPending}
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
                </FormField>

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
                        disabled={createProvider.isPending}
                    />
                </FormField>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={createProvider.isPending}
                        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-xl transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed"
                    >
                        {createProvider.isPending ? '创建中...' : '下一步'}
                    </button>
                </div>
            </form>
        </motion.div>
    );
}

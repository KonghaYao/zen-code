/**
 * Provider 表单组件 - 新增/编辑 Provider
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import { MultiLineTextInput } from 'ink-pro';
import { useSettings } from '../../context/SettingsContext';
import type { ProviderConfig } from '@codegraph/config';

export interface ProviderFormProps {
    mode: 'add' | 'edit';
    provider?: ProviderConfig;
    onCancel: () => void;
    onSave: (provider: ProviderConfig) => void;
}

const PROVIDER_TYPES = [
    { id: 'openai', label: 'OpenAI', defaultUrl: 'https://api.openai.com/v1' },
    { id: 'anthropic', label: 'Anthropic', defaultUrl: 'https://api.anthropic.com' },
];

const FIELDS = [
    { key: 'id', label: 'ID', placeholder: 'my-provider' },
    { key: 'name', label: 'Name', placeholder: 'My Provider' },
    { key: 'apiKey', label: 'API Key', placeholder: 'sk-xxx...' },
    { key: 'url', label: 'URL', placeholder: 'https://api.xxx.com' },
] as const;

type FieldKey = (typeof FIELDS)[number]['key'];

const ProviderForm: React.FC<ProviderFormProps> = ({ mode, provider, onCancel, onSave }) => {
    const { config } = useSettings();

    // 表单数据
    const [formData, setFormData] = useState({
        id: provider?.id || '',
        type: provider?.type || 'openai',
        name: provider?.id || '',
        apiKey: provider?.apiKey || '',
        baseUrl: provider?.baseUrl || PROVIDER_TYPES[0].defaultUrl,
    });

    // 错误信息
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [focusedIndex, setFocusedIndex] = useState(0);

    // 当前 Provider 类型
    const currentProviderType = useMemo(() => {
        return PROVIDER_TYPES.find((t) => t.id === formData.type) || PROVIDER_TYPES[0];
    }, [formData.type]);

    // 验证表单
    const validate = useCallback((): boolean => {
        const newErrors: Record<string, string> = {};
        const existingProviders = config?.providers || [];

        // ID 验证
        if (!formData.id || formData.id.length < 3 || formData.id.length > 32) {
            newErrors.id = 'ID 必须为 3-32 个字符';
        } else if (!/^[a-zA-Z0-9_]+$/.test(formData.id)) {
            newErrors.id = 'ID 只能包含字母、数字和下划线';
        } else if (existingProviders.some((p: ProviderConfig) => p.id === formData.id && p.id !== provider?.id)) {
            newErrors.id = 'ID 已存在';
        }

        // Name 验证
        if (!formData.name || formData.name.length < 2 || formData.name.length > 50) {
            newErrors.name = '名称必须为 2-50 个字符';
        }

        // API Key 验证
        if (!formData.apiKey) {
            newErrors.apiKey = 'API Key 不能为空';
        }

        // Base URL 验证
        if (!formData.baseUrl) {
            newErrors.baseUrl = 'Base URL 不能为空';
        } else if (!formData.baseUrl.startsWith('https://')) {
            newErrors.baseUrl = 'Base URL 必须以 https:// 开头';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData, config?.providers, provider?.id]);

    // 提交保存
    const handleSubmit = useCallback(() => {
        if (validate()) {
            onSave(formData as ProviderConfig);
        }
    }, [validate, formData, onSave]);

    // 切换 Provider 类型
    const handleTypeChange = useCallback(() => {
        const currentIndex = PROVIDER_TYPES.findIndex((t) => t.id === formData.type);
        const nextIndex = (currentIndex + 1) % PROVIDER_TYPES.length;
        const nextType = PROVIDER_TYPES[nextIndex];
        setFormData((prev) => ({
            ...prev,
            type: nextType.id,
            baseUrl: prev.baseUrl || nextType.defaultUrl,
        }));
    }, [formData.type]);

    // 切换字段焦点
    const handleFieldChange = useCallback(
        (direction: 'next' | 'prev') => {
            const nextIndex =
                direction === 'next'
                    ? (focusedIndex + 1) % FIELDS.length
                    : (focusedIndex - 1 + FIELDS.length) % FIELDS.length;
            setFocusedIndex(nextIndex);
        },
        [focusedIndex],
    );

    // 获取当前聚焦字段的 key
    const getFieldKey = (index: number): keyof typeof formData => {
        const field = FIELDS[index];
        if (field.key === 'url') return 'baseUrl';
        return field.key as keyof typeof formData;
    };

    // 键盘事件
    useInput(
        (input, key) => {
            if (key.return) {
                handleSubmit();
            } else if (key.escape) {
                onCancel();
            } else if (key.tab) {
                handleFieldChange(key.shift ? 'prev' : 'next');
            } else if (input === ' ') {
                handleTypeChange();
            }
        },
        { isActive: true },
    );

    // 渲染字段
    const renderField = (index: number) => {
        const field = FIELDS[index];
        const formKey = getFieldKey(index);
        const hasError = errors[formKey];
        const isFocused = focusedIndex === index;

        return (
            <Box key={field.key} marginBottom={0}>
                <Text color={isFocused ? 'cyan' : hasError ? 'red' : 'gray'}>{field.label}: </Text>
                {isFocused ? (
                    <Box width={50}>
                        <MultiLineTextInput
                            value={formData[formKey] as string}
                            onChange={(v) => setFormData((prev) => ({ ...prev, [formKey]: v }))}
                            onSubmit={handleSubmit}
                            placeholder={field.placeholder}
                            maxVisibleLines={1}
                            showCursor={true}
                        />
                    </Box>
                ) : (
                    <Text>{(formData[formKey] as string) || field.placeholder}</Text>
                )}
                {hasError && <Text color="red"> {hasError}</Text>}
            </Box>
        );
    };

    return (
        <Box flexDirection="column" paddingX={2}>
            <Text bold color="cyan">
                {mode === 'add' ? '新增 Provider' : '编辑 Provider'}
            </Text>

            <Box marginTop={1} flexDirection="column" gap={1}>
                {/* Provider ID */}
                {renderField(0)}

                {/* Provider Type */}
                <Box marginBottom={0}>
                    <Text color={focusedIndex === 0 ? 'cyan' : 'gray'}>Type: </Text>
                    <Text color="cyan" bold>
                        {currentProviderType.label}
                    </Text>
                    <Text color="gray"> [空格切换]</Text>
                </Box>

                {/* Provider Name */}
                {renderField(1)}

                {/* API Key */}
                {renderField(2)}

                {/* Base URL */}
                {renderField(3)}
            </Box>

            {/* 操作提示 */}
            <Box marginTop={1}>
                <Text color="gray" dimColor>
                    <Text color="cyan">Enter</Text> 保存 <Text color="cyan">Tab</Text> 切换字段{' '}
                    <Text color="cyan">Esc</Text> 取消
                </Text>
            </Box>
        </Box>
    );
};

export default ProviderForm;

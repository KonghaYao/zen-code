/**
 * Provider 表单组件 - 新增/编辑 Provider
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { MultiLineTextInput } from 'ink-pro';
import { useSettings } from '../../context/SettingsContext';
import type { ProviderConfig } from '@codegraph/config';

export interface ProviderFormProps {
    provider?: ProviderConfig;
    onCancel: () => void;
    onSave: (provider: ProviderConfig) => void;
}

const PROVIDER_TYPES = [
    { id: 'openai', label: 'OpenAI', defaultUrl: 'https://api.openai.com/v1' },
    { id: 'anthropic', label: 'Anthropic', defaultUrl: 'https://api.anthropic.com' },
    { id: 'gemini', label: 'Gemini', defaultUrl: 'https://generativelanguage.googleapis.com/v1beta' },
];

const FIELDS = [
    { key: 'id', label: 'ID', placeholder: 'my-provider' },
    { key: 'name', label: 'Name', placeholder: 'My Provider' },
    { key: 'apiKey', label: 'API Key', placeholder: 'sk-xxx...' },
    { key: 'url', label: 'URL', placeholder: 'https://api.xxx.com' },
] as const;

const ProviderForm: React.FC<ProviderFormProps> = ({ provider, onCancel, onSave }) => {
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

    // 使用 ref 稳定回调引用，避免 useInput 重复注册
    const formDataRef = useRef(formData);
    const focusedIndexRef = useRef(focusedIndex);
    const errorsRef = useRef(errors);

    // 同步 ref
    useEffect(() => {
        formDataRef.current = formData;
    }, [formData]);

    useEffect(() => {
        focusedIndexRef.current = focusedIndex;
    }, [focusedIndex]);

    useEffect(() => {
        errorsRef.current = errors;
    }, [errors]);

    // 当前 Provider 类型
    const currentProviderType = useMemo(() => {
        return PROVIDER_TYPES.find((t) => t.id === formData.type) || PROVIDER_TYPES[0];
    }, [formData.type]);

    // 验证表单 - 使用 ref 避免依赖变化
    const validate = useCallback((): boolean => {
        const currentFormData = formDataRef.current;
        const newErrors: Record<string, string> = {};
        const existingProviders = config?.providers || [];

        // ID 验证
        if (!currentFormData.id || currentFormData.id.length < 3 || currentFormData.id.length > 32) {
            newErrors.id = 'ID 必须为 3-32 个字符';
        } else if (!/^[a-zA-Z0-9_]+$/.test(currentFormData.id)) {
            newErrors.id = 'ID 只能包含字母、数字和下划线';
        } else if (
            existingProviders.some((p: ProviderConfig) => p.id === currentFormData.id && p.id !== provider?.id)
        ) {
            newErrors.id = 'ID 已存在';
        }

        // Name 验证
        if (!currentFormData.name || currentFormData.name.length < 2 || currentFormData.name.length > 50) {
            newErrors.name = '名称必须为 2-50 个字符';
        }

        // API Key 验证
        if (!currentFormData.apiKey) {
            newErrors.apiKey = 'API Key 不能为空';
        }

        // Base URL 验证
        if (!currentFormData.baseUrl) {
            newErrors.baseUrl = 'Base URL 不能为空';
        } else if (!currentFormData.baseUrl.startsWith('https://')) {
            newErrors.baseUrl = 'Base URL 必须以 https:// 开头';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [config?.providers, provider?.id]);

    // 使用 ref 存储 validate 函数
    const validateRef = useRef(validate);
    useEffect(() => {
        validateRef.current = validate;
    }, [validate]);

    // 提交保存 - 使用 ref 稳定引用
    const handleSubmit = useCallback(() => {
        if (validateRef.current()) {
            onSave(formDataRef.current as ProviderConfig);
        }
    }, [onSave]);

    // 切换 Provider 类型 - 使用 ref
    const handleTypeChange = useCallback(() => {
        const currentType = formDataRef.current.type;
        const currentIndex = PROVIDER_TYPES.findIndex((t) => t.id === currentType);
        const nextIndex = (currentIndex + 1) % PROVIDER_TYPES.length;
        const nextType = PROVIDER_TYPES[nextIndex];
        setFormData((prev) => ({
            ...prev,
            type: nextType.id,
            baseUrl: prev.baseUrl || nextType.defaultUrl,
        }));
    }, []);

    // 切换字段焦点 - 使用 ref
    const handleFieldChange = useCallback((direction: 'next' | 'prev') => {
        const currentFocusedIndex = focusedIndexRef.current;
        const nextIndex =
            direction === 'next'
                ? (currentFocusedIndex + 1) % FIELDS.length
                : (currentFocusedIndex - 1 + FIELDS.length) % FIELDS.length;
        setFocusedIndex(nextIndex);
    }, []);

    // 获取当前聚焦字段的 key
    const getFieldKey = (index: number): keyof typeof formData => {
        const field = FIELDS[index];
        if (field.key === 'url') return 'baseUrl';
        return field.key as keyof typeof formData;
    };

    // 使用 ref 存储回调，避免 useInput handler 变化
    const handleSubmitRef = useRef(handleSubmit);
    const handleFieldChangeRef = useRef(handleFieldChange);
    const handleTypeChangeRef = useRef(handleTypeChange);
    const onCancelRef = useRef(onCancel);

    useEffect(() => {
        handleSubmitRef.current = handleSubmit;
    }, [handleSubmit]);

    useEffect(() => {
        handleFieldChangeRef.current = handleFieldChange;
    }, [handleFieldChange]);

    useEffect(() => {
        handleTypeChangeRef.current = handleTypeChange;
    }, [handleTypeChange]);

    useEffect(() => {
        onCancelRef.current = onCancel;
    }, [onCancel]);

    // 键盘事件 - 使用稳定的 handler
    useInput(
        (input, key) => {
            if (key.return) {
                handleSubmitRef.current();
            } else if (key.escape) {
                onCancelRef.current();
            } else if (key.tab) {
                handleFieldChangeRef.current(key.shift ? 'prev' : 'next');
            } else if (input === ' ') {
                handleTypeChangeRef.current();
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

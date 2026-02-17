/**
 * MCP JSON 编辑器 - 用于新增/编辑 MCP 服务器配置
 *
 * 特性：
 * - Server ID 输入（新增模式）
 * - JSON 配置编辑
 * - 实时 JSON 格式验证
 * - 自动格式化（2 空格缩进）
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Box, Text } from 'ink';
import { MultiLineTextInput } from 'ink-pro';
import type { MCPServerConfig } from '@langgraph-js/standard-agent';

export interface McpJsonEditorProps {
    mode: 'add' | 'edit';
    serverName?: string;
    serverConfig?: MCPServerConfig;
    onCancel: () => void;
    onSave: (name: string, config: MCPServerConfig) => void;
}

/**
 * JSON 验证结果
 */
interface JSONValidationResult {
    isValid: boolean;
    error?: {
        message: string;
        line?: number;
        column?: number;
    };
    config?: MCPServerConfig;
}

/**
 * 验证 JSON 配置
 */
function validateConfigJSON(jsonString: string): JSONValidationResult {
    try {
        const parsed = JSON.parse(jsonString);

        // 验证必须是对象
        if (typeof parsed !== 'object' || parsed === null) {
            return {
                isValid: false,
                error: { message: '配置必须是 JSON 对象' },
            };
        }

        // 验证是有效的 MCP 服务器配置
        // 至少包含 command 或 url 其中之一
        if (!parsed.command && !parsed.url) {
            return {
                isValid: false,
                error: {
                    message: '配置必须包含 "command" (stdio) 或 "url" (SSE)',
                },
            };
        }

        return {
            isValid: true,
            config: parsed as MCPServerConfig,
        };
    } catch (error) {
        // 尝试解析错误位置
        const errorMessage = error instanceof Error ? error.message : String(error);
        const lineMatch = errorMessage.match(/position (\d+)/);
        const line = lineMatch ? parseInt(lineMatch[1], 10) : undefined;

        return {
            isValid: false,
            error: { message: `JSON 格式错误: ${errorMessage}`, line },
        };
    }
}

/**
 * 验证服务器名称
 */
function validateServerName(name: string, existingNames: string[], originalName?: string): string | null {
    if (!name || name.length < 2 || name.length > 32) {
        return '名称必须为 2-32 个字符';
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
        return '名称只能包含字母、数字、下划线和连字符';
    }
    if (existingNames.includes(name) && name !== originalName) {
        return '名称已存在';
    }
    return null;
}

/**
 * 格式化 JSON 配置
 */
function formatConfigJSON(config: MCPServerConfig, indent: number = 2): string {
    return JSON.stringify(config, null, indent);
}

const FIELDS = [
    { key: 'serverName', label: 'Server ID' },
    { key: 'config', label: 'Config (JSON)' },
] as const;

type FieldKey = (typeof FIELDS)[number]['key'];

const McpJsonEditor: React.FC<McpJsonEditorProps> = ({ mode, serverName, serverConfig, onCancel, onSave }) => {
    const [formData, setFormData] = useState({
        serverName: serverName || '',
        configJSON: serverConfig ? formatConfigJSON(serverConfig) : '',
    });

    const [focusedIndex, setFocusedIndex] = useState(0);
    const [nameError, setNameError] = useState<string | null>(null);

    // 获取所有已有的服务器名称（用于验证唯一性）
    const existingNames = useMemo(() => {
        // 这里需要从 props 或 context 获取现有服务器列表
        // 暂时返回空数组，由父组件处理
        return [];
    }, []);

    // 验证 JSON 格式
    const validationResult = useMemo(() => {
        return validateConfigJSON(formData.configJSON);
    }, [formData.configJSON]);

    // 验证服务器名称
    const validateName = useCallback(() => {
        const error = validateServerName(formData.serverName, existingNames, mode === 'edit' ? serverName : undefined);
        setNameError(error);
        return error === null;
    }, [formData.serverName, existingNames, serverName, mode]);

    // 提交保存
    const handleSubmit = useCallback(() => {
        // 验证名称（仅新增模式）
        if (mode === 'add' && !validateName()) {
            return;
        }

        // 验证 JSON
        if (!validationResult.isValid || !validationResult.config) {
            return;
        }

        // 保存配置
        onSave(formData.serverName, validationResult.config);
    }, [mode, formData.serverName, validationResult, onSave, validateName]);

    // 切换字段焦点
    const handleFieldChange = useCallback(
        (direction: 'next' | 'prev') => {
            const maxIndex = mode === 'add' ? FIELDS.length - 1 : 1; // 编辑模式跳过名称字段
            const nextIndex =
                direction === 'next' ? (focusedIndex + 1) % maxIndex : (focusedIndex - 1 + maxIndex) % maxIndex;
            setFocusedIndex(nextIndex);
        },
        [focusedIndex, mode],
    );

    // 渲染名称输入字段（仅新增模式）
    const renderNameField = () => {
        if (mode !== 'add') return null;

        const isFocused = focusedIndex === 0;
        const hasError = nameError !== null;

        return (
            <Box marginBottom={1}>
                <Text color={isFocused ? 'cyan' : hasError ? 'red' : 'gray'}>Server ID: </Text>
                {isFocused ? (
                    <Box width={40}>
                        <MultiLineTextInput
                            value={formData.serverName}
                            onChange={(v) => {
                                setFormData((prev) => ({ ...prev, serverName: v }));
                                setNameError(null);
                            }}
                            onSubmit={handleSubmit}
                            placeholder="my-server"
                            maxVisibleLines={1}
                            showCursor={true}
                        />
                    </Box>
                ) : (
                    <Text>{formData.serverName || 'my-server'}</Text>
                )}
                {hasError && <Text color="red"> {nameError}</Text>}
            </Box>
        );
    };

    // 渲染 JSON 输入字段
    const renderConfigField = () => {
        const isFocused = mode === 'add' ? focusedIndex === 1 : focusedIndex === 0;
        const isValid = validationResult.isValid;

        return (
            <Box flexDirection="column" marginBottom={1}>
                <Text color={isFocused ? 'cyan' : 'gray'}>Config (JSON):</Text>
                <Box marginTop={1}>
                    <MultiLineTextInput
                        value={formData.configJSON}
                        onChange={(v) => setFormData((prev) => ({ ...prev, configJSON: v }))}
                        onSubmit={handleSubmit}
                        placeholder={`{\n  "command": "npx",\n  "args": ["-y", "..."]\n}`}
                        showCursor={true}
                    />
                </Box>
                {formData.configJSON && (
                    <Box marginTop={1}>
                        {isValid ? (
                            <Text color="green">✓ JSON 格式有效</Text>
                        ) : (
                            <Text color="red">✗ {validationResult.error?.message || 'JSON 格式错误'}</Text>
                        )}
                    </Box>
                )}
            </Box>
        );
    };

    // 操作提示
    const renderFooter = () => (
        <Box marginTop={1}>
            <Text color="gray" dimColor>
                <Text color="cyan">Enter</Text> 保存 <Text color="cyan">Tab</Text> 切换字段{' '}
                <Text color="cyan">Esc</Text> 取消
            </Text>
        </Box>
    );

    return (
        <Box flexDirection="column" paddingX={2}>
            {/* 标题 */}
            <Box marginBottom={1}>
                <Text bold color="cyan">
                    {mode === 'add' ? 'Add MCP Server' : `Edit MCP Server: ${serverName}`}
                </Text>
            </Box>

            {/* 字段 */}
            <Box flexDirection="column" gap={1}>
                {renderNameField()}
                {renderConfigField()}
            </Box>

            {/* 操作提示 */}
            {renderFooter()}
        </Box>
    );
};

export default McpJsonEditor;

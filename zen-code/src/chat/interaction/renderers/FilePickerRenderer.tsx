/**
 * 文件选择器渲染器示例
 * 演示如何扩展自定义交互类型
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import type { InteractionRenderer } from '../registry';
import type { PanelInteraction } from '../panel';
import { MultiSelectPro } from 'ink-pro';

/**
 * 文件选择器内容类型（扩展 CustomContent）
 */
export interface FilePickerContent {
    type: 'custom';
    customType: 'file-picker';
    /** 接受的文件类型 */
    accept?: string;
    /** 是否允许多选 */
    multiple?: boolean;
    /** 最大文件数 */
    maxFiles?: number;
    /** 默认路径 */
    defaultPath?: string;
}

/**
 * 文件选择器结果类型
 */
export interface FilePickerResult {
    /** 选中的文件路径 */
    files: string[];
}

/**
 * 文件选择器渲染器
 * 这是一个自定义渲染器的示例实现
 */
export const FilePickerRenderer: InteractionRenderer<FilePickerContent> = {
    type: 'custom',

    /**
     * 渲染文件选择器交互
     */
    render(interaction: PanelInteraction & { content: FilePickerContent }, onChange) {
        const { content, metadata } = interaction;
        const [selected, setSelected] = useState<string[]>([]);
        const [customPath, setCustomPath] = useState(content.defaultPath || '');

        // 示例文件列表（实际应用中应该从文件系统读取）
        const exampleFiles = [
            { label: '/src/index.ts', value: '/src/index.ts' },
            { label: '/src/app.tsx', value: '/src/app.tsx' },
            { label: '/package.json', value: '/package.json' },
            { label: '/README.md', value: '/README.md' },
            { label: '/tsconfig.json', value: '/tsconfig.json' },
        ];

        const handleSubmit = () => {
            onChange({
                state: 'submitted',
                result: { files: selected },
            });
        };

        return (
            <Box flexDirection="column" paddingX={1}>
                {/* 标题和描述 */}
                {metadata?.title && (
                    <Box marginBottom={1}>
                        <Text color="cyan" bold>
                            {metadata.title}
                        </Text>
                    </Box>
                )}
                {metadata?.description && (
                    <Box marginBottom={1}>
                        <Text dimColor>{metadata.description}</Text>
                    </Box>
                )}

                {/* 文件列表 */}
                <Box marginBottom={1}>
                    <Text color="yellow">Select files:</Text>
                </Box>
                <MultiSelectPro
                    options={exampleFiles}
                    singleSelect={!content.multiple}
                    onChange={setSelected}
                    onSubmit={handleSubmit}
                    autoFocus={true}
                />

                {/* 提示信息 */}
                <Box marginTop={1}>
                    <Text dimColor>
                        {content.multiple
                            ? `Select files (${content.maxFiles ? `max ${content.maxFiles}` : 'unlimited'})`
                            : 'Select a file'}
                    </Text>
                </Box>
            </Box>
        );
    },

    /**
     * 验证函数
     */
    validate(content: FilePickerContent): string | undefined {
        if (content.maxFiles && content.maxFiles < 1) {
            return 'maxFiles must be at least 1';
        }
        return undefined;
    },

    /**
     * 默认配置
     */
    defaultConfig: {
        layout: {
            border: false,
            padding: 1,
        },
        interaction: {
            autoSubmit: false,
        },
    },
};

/**
 * 注册文件选择器渲染器的便捷函数
 * 使用示例：
 * ```ts
 * import { registerFilePickerRenderer } from './interaction/renderers/FilePickerRenderer';
 * registerFilePickerRenderer();
 * ```
 */
export function registerFilePickerRenderer(): void {
    const { rendererRegistry } = require('../registry');
    rendererRegistry.register('custom', FilePickerRenderer);
}

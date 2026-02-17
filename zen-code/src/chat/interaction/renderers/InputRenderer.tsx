/**
 * 输入渲染器
 * 渲染输入类型的交互内容
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import type { InteractionRenderer } from '../registry';
import type { InputContent } from '../content';
import type { PanelInteraction } from '../panel';
import { EnhancedTextInput } from '../../components/input/EnhancedTextInput';

/**
 * 输入渲染器实现
 */
export const InputRenderer: InteractionRenderer<InputContent> = {
    type: 'input',

    /**
     * 渲染输入交互
     */
    render(interaction: PanelInteraction & { content: InputContent }, onChange) {
        const { content, metadata } = interaction;
        const [value, setValue] = useState(content.defaultValue || '');

        const handleSubmit = () => {
            onChange({
                state: 'submitted',
                result: { value },
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

                {/* 输入组件 */}
                <Box>
                    <EnhancedTextInput
                        value={value}
                        onChange={setValue}
                        onSubmit={handleSubmit}
                        placeholder={content.placeholder}
                        autoFocus={true}
                    />
                    )
                </Box>

                {/* 提示信息 */}
                {content.maxLength && (
                    <Box marginTop={1}>
                        <Text dimColor>Max length: {content.maxLength}</Text>
                    </Box>
                )}
            </Box>
        );
    },

    /**
     * 验证函数
     */
    validate(content: InputContent): string | undefined {
        if (content.validation?.pattern && content.defaultValue) {
            if (!content.validation.pattern.test(content.defaultValue)) {
                return 'Input does not match required pattern';
            }
        }
        if (
            content.validation?.minLength &&
            content.defaultValue &&
            content.defaultValue.length < content.validation.minLength
        ) {
            return `Input must be at least ${content.validation.minLength} characters`;
        }
        return undefined;
    },

    /**
     * 默认配置
     */
    defaultConfig: {
        layout: {
            border: true,
            padding: 1,
        },
        interaction: {
            autoSubmit: false,
        },
    },
};

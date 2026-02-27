/**
 * 选择渲染器
 * 渲染选择类型的交互内容
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import type { InteractionRenderer } from '../registry';
import type { SelectionContent } from '../content';
import type { PanelInteraction } from '../panel';
import { MultiSelectPro } from 'ink-pro';
import { EnhancedTextInput } from '../../components/input/EnhancedTextInput';
import { truncateByContext } from '../textUtils';

/**
 * 截断选项标签 - 确保不超长
 */
const truncateOptionLabel = (label: string): string => {
    return truncateByContext(label, 'optionLabel');
};

/**
 * 选择渲染器实现
 */
export const SelectionRenderer: InteractionRenderer<SelectionContent> = {
    type: 'selection',

    /**
     * 渲染选择交互
     */
    render(interaction: PanelInteraction & { content: SelectionContent }, onChange) {
        const { content, metadata, result } = interaction;

        // 从 interaction.result 中恢复已保存的状态
        const [selected, setSelected] = useState<any[]>(result?.selected || []);
        const [customInput, setCustomInput] = useState(result?.customInput || '');

        // 转换选项格式 - 截断过长的标签
        const options = content.options.map((opt) => ({
            label: truncateOptionLabel(opt.label),
            value: opt.value,
        }));

        // 保存临时状态到 interaction
        const saveTempState = (newSelected?: any[], newCustomInput?: string) => {
            onChange({
                result: {
                    selected: newSelected ?? selected,
                    customInput: newCustomInput ?? customInput,
                },
            });
        };

        const handleSelectChange = (newSelected: any[]) => {
            setSelected(newSelected);
            saveTempState(newSelected, undefined);
        };

        const handleCustomInputChange = (newInput: string) => {
            setCustomInput(newInput);
            saveTempState(undefined, newInput);
        };

        const handleSubmit = () => {
            onChange({
                state: 'submitted',
                result: { selected, customInput },
            });
        };

        // 截断标题和描述
        const displayTitle = metadata?.title ? truncateByContext(metadata.title, 'title') : null;
        const displayDescription = metadata?.description
            ? truncateByContext(metadata.description, 'description')
            : null;

        return (
            <Box flexDirection="column" paddingX={1}>
                {/* 标题和描述 */}
                {displayTitle && (
                    <Box marginBottom={1}>
                        <Text color="cyan" bold>
                            {displayTitle}
                        </Text>
                    </Box>
                )}
                {displayDescription && (
                    <Box marginBottom={1}>
                        <Text dimColor>{displayDescription}</Text>
                    </Box>
                )}

                {/* 多选组件 */}
                <MultiSelectPro
                    options={options}
                    singleSelect={content.singleSelect}
                    values={selected}
                    onChange={handleSelectChange}
                    onSubmit={handleSubmit}
                    autoFocus={true}
                />

                {/* 自定义输入 */}
                {content.allowCustomInput && (
                    <Box marginTop={1} flexDirection="column">
                        <EnhancedTextInput
                            value={customInput}
                            onChange={handleCustomInputChange}
                            onSubmit={handleSubmit}
                            placeholder={content.placeholder || 'Type custom option...'}
                            autoFocus={false}
                        />
                    </Box>
                )}
            </Box>
        );
    },

    /**
     * 验证函数
     */
    validate(content: SelectionContent): string | undefined {
        if (content.options.length === 0) {
            return 'At least one option is required';
        }
        if (content.singleSelect && content.maxSelections && content.maxSelections > 1) {
            return 'Single select cannot have maxSelections > 1';
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

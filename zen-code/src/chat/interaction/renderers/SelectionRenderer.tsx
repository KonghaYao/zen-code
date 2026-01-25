/**
 * 选择渲染器
 * 渲染选择类型的交互内容
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import type { InteractionRenderer } from '../registry';
import type { SelectionContent } from '../content';
import type { PanelInteraction } from '../panel';
import { MultiSelectPro } from '../../components/input/MultiSelect';
import { EnhancedTextInput } from '../../components/input/EnhancedTextInput';

/**
 * 选择渲染器实现
 */
export const SelectionRenderer: InteractionRenderer<SelectionContent> = {
  type: 'selection',

  /**
   * 渲染选择交互
   */
  render(interaction: PanelInteraction & { content: SelectionContent }, onChange) {
    const { content, metadata } = interaction;
    const [selected, setSelected] = useState<any[]>([]);
    const [customInput, setCustomInput] = useState('');

    // 转换选项格式
    const options = content.options.map(opt => ({
      label: opt.label,
      value: opt.value,
    }));

    const handleSubmit = () => {
      onChange({
        state: 'submitted',
        result: { selected, customInput },
      });
    };

    return (
      <Box flexDirection="column" paddingX={1}>
        {/* 标题和描述 */}
        {metadata?.title && (
          <Box marginBottom={1}>
            <Text color="cyan" bold>{metadata.title}</Text>
          </Box>
        )}
        {metadata?.description && (
          <Box marginBottom={1}>
            <Text dimColor>{metadata.description}</Text>
          </Box>
        )}

        {/* 多选组件 */}
        <MultiSelectPro
          options={options}
          singleSelect={content.singleSelect}
          onChange={setSelected}
          onSubmit={handleSubmit}
          autoFocus={true}
        />

        {/* 自定义输入 */}
        {content.allowCustomInput && (
          <Box marginTop={1} flexDirection="column">
            <EnhancedTextInput
              value={customInput}
              onChange={setCustomInput}
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
      border: true,
      padding: 1,
    },
    interaction: {
      autoSubmit: false,
    },
  },
};

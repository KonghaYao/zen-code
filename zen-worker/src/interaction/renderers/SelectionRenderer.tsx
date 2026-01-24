/**
 * 选择渲染器 (Web 版本)
 * 渲染选择类型的交互内容
 */

import React from 'react';
import type { InteractionRenderer } from '../types';
import type { SelectionContent } from '../content';
import type { PanelInteraction } from '../types';
import { SelectionItem } from '../../components/Selection/SelectionItem';

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

    // 转换选项格式
    const options = content.options.map(opt => ({
      label: opt.label,
      value: opt.value,
      description: opt.description,
    }));

    const handleSubmit = (result: { selected: string[]; customInput: string }) => {
      onChange({
        state: 'submitted',
        result: {
          status: 'selected',
          ...result,
        },
      });
    };

    return (
      <SelectionItem
        key={interaction.id}
        title={metadata?.title}
        description={metadata?.description}
        options={options}
        singleSelect={content.singleSelect}
        maxSelections={content.maxSelections}
        allowCustomInput={content.allowCustomInput}
        placeholder={content.placeholder}
        onSubmit={handleSubmit}
      />
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

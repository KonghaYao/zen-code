/**
 * 确认渲染器
 * 渲染确认类型的交互内容
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { InteractionRenderer } from '../registry';
import type { ConfirmContent } from '../content';
import type { PanelInteraction } from '../panel';
import { MultiSelectPro } from '../../components/input/MultiSelect';

/**
 * 确认渲染器实现
 */
export const ConfirmRenderer: InteractionRenderer<ConfirmContent> = {
  type: 'confirm',

  /**
   * 渲染确认交互
   */
  render(interaction: PanelInteraction & { content: ConfirmContent }, onChange) {
    const { content, metadata } = interaction;

    const handleConfirm = () => {
      onChange({
        state: 'submitted',
        result: { confirmed: true },
      });
    };

    const handleCancel = () => {
      onChange({
        state: 'cancelled',
        result: { confirmed: false },
      });
    };

    // 构建选项
    const options = [
      {
        label: content.confirmLabel || 'Confirm',
        value: 'confirm',
      },
      {
        label: content.cancelLabel || 'Cancel',
        value: 'cancel',
      },
    ];

    const handleSubmit = ([selected]: string[]) => {
      if (selected === 'confirm') {
        handleConfirm();
      } else {
        handleCancel();
      }
    };

    return (
      <Box flexDirection="column" paddingX={1}>
        {/* 标题和描述 */}
        {metadata?.title && (
          <Box marginBottom={1}>
            <Text color={content.danger ? 'red' : 'cyan'} bold>{metadata.title}</Text>
          </Box>
        )}

        {/* 消息 */}
        <Box marginBottom={1}>
          <Text>{content.message}</Text>
        </Box>

        {/* 选项 */}
        <MultiSelectPro
          options={options}
          singleSelect
          onSubmit={handleSubmit}
          autoFocus={true}
        />
      </Box>
    );
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

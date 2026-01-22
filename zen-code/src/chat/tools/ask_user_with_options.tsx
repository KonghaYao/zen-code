/**
 * ask_user_with_options 工具
 * 使用新的统一 UI 交互系统
 */

import { ask_user_with_options_config } from '@langgraph-js/auk';
import { createUITool, ToolManager } from '@langgraph-js/sdk';
import { Box, Text } from 'ink';
import { useEffect, useState, useRef } from 'react';
import { useInteractionContext } from '../interaction';
import type { SelectionContent } from '../interaction/content';

// 内部组件：使用新的交互系统
const SelectionContentComponent: React.FC<{
  tool: any;
}> = ({ tool }) => {
  const { addInteraction, getInteractions, updateInteraction } = useInteractionContext();
  const [interactionId, setInteractionId] = useState<string | null>(null);
  const hasProcessedRef = useRef(false);
  const input = tool.getInputRepaired();
  const fm = require('ink').useFocusManager();

  // 当工具中断时，自动添加交互
  useEffect(() => {
    if (tool.state === 'interrupted' && !interactionId && !hasProcessedRef.current) {
      // 转换选项格式
      const options = input.options?.map((option: any) => ({
        label: option.label,
        value: option.label,
        description: option.description,
      })) || [];

      // 构建选择内容
      const content: SelectionContent = {
        type: 'selection',
        options,
        singleSelect: input.type === 'single_select',
        allowCustomInput: input.allow_custom_input ?? true,
        placeholder: input.placeholder,
      };

      // 添加交互
      const interaction = addInteraction(
        content,
        {
          tool,
          metadata: {
            title: input.description || 'Select an option',
            groupKey: 'user-input',
          },
        }
      );

      setInteractionId(interaction.id);
    }
  }, [tool, interactionId, addInteraction, input]);

  // 监听交互状态变化，当交互完成时发送结果
  useEffect(() => {
    if (!interactionId || hasProcessedRef.current) return;

    const checkInteraction = () => {
      const interactions = getInteractions();
      const interaction = interactions.find(i => i.id === interactionId);

      if (interaction && (interaction.state === 'submitted' || interaction.state === 'edited' || interaction.state === 'cancelled') && !interaction.resultSent) {
        hasProcessedRef.current = true;

        // 构建结果消息
        const result = interaction.result;
        let message = '';

        if (result) {
          if (result.selected && result.selected.length > 0) {
            message += `User selected: ${result.selected.join(', ')}`;
          }
          if (result.customInput && result.customInput.trim()) {
            message += (message ? '\n' : '') + `User Custom Input: ${result.customInput}`;
          }
        }

        // 发送结果给工具
        tool.sendResumeData({
          type: 'respond',
          message: message || 'User made a selection',
        });

        // 标记结果已发送
        updateInteraction(interactionId, { resultSent: true });
      }
    };

    // 立即检查一次
    checkInteraction();

    // 设置轮询检查交互状态
    const interval = setInterval(checkInteraction, 100);

    return () => clearInterval(interval);
  }, [interactionId, getInteractions, updateInteraction, tool]);

  // 渲染预览
  if (tool.state === 'interrupted' && !tool.output) {
    return (
      <Box flexDirection="column">
        <Box paddingX={1}>
          <Text color="yellow">⏳ Waiting for selection...</Text>
        </Box>
      </Box>
    );
  }

  // 渲染输出
  if (tool.output) {
    return <Text color="yellow">{tool.output}</Text>;
  }

  return null;
};

export const ask_user_with_options = createUITool({
  name: 'ask_user_with_options',
  description: 'Ask the user for a selection from a list of options',
  parameters: ask_user_with_options_config.schema.shape,
  handler: ToolManager.waitForUIDone,
  render(tool) {
    return <SelectionContentComponent tool={tool} />;
  },
});

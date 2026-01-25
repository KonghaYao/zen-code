/**
 * terminal 工具
 * 使用新的统一 UI 交互系统
 */

import { createUITool, ToolManager, ToolRenderData } from '@langgraph-js/sdk';
import { Box, Text } from 'ink';
import { useState, useEffect, useRef } from 'react';
import { LimitedOutput } from '../components/LimitedOutput';
import { useInteractionContext } from '../interaction';
import type { ApprovalContent } from '../interaction/content';

// 内部组件：使用新的交互系统
const ApprovalContentComponent: React.FC<{
  tool: ToolRenderData<Record<string, never>, any>;
}> = ({ tool }) => {
  const { addInteraction, getInteractions, updateInteraction } = useInteractionContext();
  const [interactionId, setInteractionId] = useState<string | null>(null);
  const hasProcessedRef = useRef(false);

  // 获取审批配置
  const interrupt = tool.getHumanInTheLoopData();

  // 当有审批配置时，自动添加到交互队列
  useEffect(() => {
    if (interrupt?.reviewConfig && tool.state === 'interrupted' && !interactionId && !hasProcessedRef.current) {
      // 获取消息索引和描述
      const description = tool.getInputRepaired()?.description;

      // 构建审批内容
      const content: ApprovalContent = {
        type: 'approval',
        toolCall: {
          name: tool.message.name!,
          args: tool.getInputRepaired(),
        },
        editableFields: ['args'],
      };

      // 添加交互
      const interaction = addInteraction(content, {
        tool,
        metadata: {
          title: `Approve ${tool.message.name}`,
          description,
          groupKey: 'approvals',
        },
      });

      setInteractionId(interaction.id);
    }
  }, [interrupt, tool, interactionId, addInteraction]);

  // 监听交互状态变化，当交互完成时发送结果
  useEffect(() => {
    if (!interactionId || hasProcessedRef.current) return;

    const checkInteraction = () => {
      const interactions = getInteractions();
      const interaction = interactions.find(i => i.id === interactionId);

      if (interaction && (interaction.state === 'submitted' || interaction.state === 'edited' || interaction.state === 'cancelled') && !interaction.resultSent) {
        hasProcessedRef.current = true;

        const result = interaction.result;

        // 根据审批状态调用 sendResumeData
        if (result) {
          if (result.status === 'approved') {
            tool.sendResumeData({ type: 'approve' });
          } else if (result.status === 'edited') {
            const editedAction = {
              name: tool.message.name!,
              args: result.editedArgs,
            };
            tool.sendResumeData({
              type: 'edit',
              edited_action: editedAction,
            });
          } else if (result.status === 'rejected') {
            const message = result.message || 'User rejected to run this tool';
            tool.sendResumeData({
              type: 'reject',
              message,
            });
          }
        }

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

  // 渲染预览状态
  if (interrupt?.reviewConfig && interactionId && !tool.output) {
    return (
      <Box flexDirection="column">
        <Box paddingX={1} paddingY={1}>
          <Text color="yellow">
            ⏳ Wait for Approval
          </Text>
        </Box>
      </Box>
    );
  }

  // 渲染输出（如果有）
  const renderOutput = () => {
    if (!tool.output) return null;
    return <LimitedOutput content={tool.output} maxLines={10} borderColor="cyan" />;
  };

  return (
    <Box flexDirection="column">
      {/* Output */}
      {renderOutput()}
    </Box>
  );
};

export const terminal = createUITool({
  name: 'terminal',
  description: '',
  parameters: {},
  handler: ToolManager.waitForUIDone,
  render(tool) {
    return <ApprovalContentComponent tool={tool} />;
  },
});

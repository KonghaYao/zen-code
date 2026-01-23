/**
 * terminal 工具 - React DOM 版本
 *
 * 使用统一 UI 交互系统
 * 当工具被中断时，自动添加到审批队列
 */

import React, { useEffect, useState, useRef } from 'react';
import { createUITool, ToolManager, ToolRenderData } from '@langgraph-js/sdk';
import { useInteractionContext } from '../interaction';
import type { ApprovalContent } from '../interaction';

/**
 * 审批内容组件
 * 使用统一交互系统
 */
const ApprovalContentComponent: React.FC<{
  tool: ToolRenderData<Record<string, never>, any>;
}> = ({ tool }) => {
  const { addInteraction, getInteractions, updateInteraction } = useInteractionContext();
  const [interactionId, setInteractionId] = useState<string | null>(null);
  const hasProcessedRef = useRef(false);

  // 获取审批配置
  const interrupt = tool.getHumanInTheLoopData();

  // 详细日志
  console.log('[terminal] ===== Tool Render Debug =====');
  console.log('[terminal] tool.state:', tool.state);
  console.log('[terminal] tool.status:', tool.status);
  console.log('[terminal] interrupt:', interrupt);
  console.log('[terminal] tool.message:', tool.message);
  console.log('[terminal] tool.getInputRepaired():', tool.getInputRepaired());

  // 当有审批配置时，自动添加到交互队列
  useEffect(() => {
    console.log('[terminal] tool.state:', tool.state);
    console.log('[terminal] interrupt:', interrupt);
    console.log('[terminal] tool:', tool);
    console.log('[terminal] tool.message:', tool.message);

    if (interrupt?.reviewConfig && tool.state === 'interrupted' && !interactionId && !hasProcessedRef.current) {
      console.log('[terminal] Adding approval interaction for tool:', tool.message.name);

      // 获取消息索引和描述
      const input = tool.getInputRepaired();
      const description = input?.description;

      // 构建审批内容
      const content: ApprovalContent = {
        type: 'approval',
        toolCall: {
          name: tool.message.name!,
          args: input,
        },
        editableFields: ['args'],
      };

      // 添加交互
      const interaction = addInteraction(content, {
        tool,
        metadata: {
          title: `审批 ${tool.message.name}`,
          description,
          groupKey: 'approvals',
        },
      });

      setInteractionId(interaction.id);
      console.log('[terminal] Added approval interaction:', interaction.id);
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

          console.log('[terminal] Sent approval result:', result.status);
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

  const input = tool.getInputRepaired();
  const output = tool.output as string;
  const status = tool.status;

  // 渲染预览状态
  if (interrupt?.reviewConfig && interactionId && !tool.output) {
    return (
      <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-gray-500">$</span>
          <span className="text-white">{input?.command || ''}</span>
        </div>
        <div className="text-yellow-400">
          ⏳ 等待审批...
        </div>
      </div>
    );
  }

  // 渲染输出
  const renderOutput = () => {
    if (!output) return null;
    return (
      <pre className="whitespace-pre-wrap text-xs mt-2 text-green-400">
        {output}
      </pre>
    );
  };

  return (
    <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-gray-500">$</span>
        <span className="text-white">{input?.command || ''}</span>
      </div>

      {status === 'running' && !interrupt && (
        <div className="text-blue-400 animate-pulse">
          执行中...
        </div>
      )}

      {renderOutput()}
    </div>
  );
};

export const terminal = createUITool({
  name: 'terminal',
  description: 'Execute terminal commands',
  parameters: {} as any,
  handler: ToolManager.waitForUIDone,
  render(tool) {
    return <ApprovalContentComponent tool={tool} />;
  },
});

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

  // 当有审批配置时，自动添加到交互队列
  useEffect(() => {
    console.log('[terminal] Effect triggered:', {
      hasInterrupt: !!interrupt?.reviewConfig,
      toolState: tool.state,
      interactionId,
      hasProcessed: hasProcessedRef.current,
    });

    if (interrupt?.reviewConfig && tool.state === 'interrupted' && !interactionId && !hasProcessedRef.current) {
      // 获取描述
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

      // 检查是否已经存在相同的交互（由 useApprovalIntegration 添加）
      const interactions = getInteractions();
      const existingInteraction = interactions.find(i =>
        i.content.type === 'approval' &&
        (i.content as any).toolCall?.name === tool.message.name &&
        JSON.stringify((i.content as any).toolCall?.args) === JSON.stringify(tool.getInputRepaired())
      );

      if (existingInteraction) {
        // 如果已存在，使用已存在的交互 ID，并更新 tool 对象
        console.log('[terminal] Found existing interaction, updating tool object:', existingInteraction.id);
        setInteractionId(existingInteraction.id);
        updateInteraction(existingInteraction.id, { tool });
      } else {
        // 如果不存在，添加新的交互
        console.log('[terminal] Adding new interaction:', content);
        const interaction = addInteraction(content, {
          tool,
          metadata: {
            title: `Approve ${tool.message.name}`,
            description,
            groupKey: 'approvals',
          },
        });
        console.log('[terminal] Interaction added with ID:', interaction.id);
        setInteractionId(interaction.id);
      }
    }
  }, [interrupt, tool, interactionId, addInteraction, getInteractions, updateInteraction]);

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

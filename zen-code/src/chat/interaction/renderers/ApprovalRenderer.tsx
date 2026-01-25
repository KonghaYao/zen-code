/**
 * 审批渲染器
 * 渲染审批类型的交互内容
 */

import type { InteractionRenderer } from '../registry';
import type { ApprovalContent } from '../content';
import type { PanelInteraction } from '../panel';
import { ApprovalItem } from '../../components/GlobalApprovalPanel/ApprovalItem';

/**
 * 审批渲染器实现
 */
export const ApprovalRenderer: InteractionRenderer<ApprovalContent> = {
  type: 'approval',

  /**
   * 渲染审批交互
   */
  render(interaction: PanelInteraction & { content: ApprovalContent }, onChange) {
    const { content, metadata } = interaction;

    // 将 ApprovalItem 转换为可用的格式
    const handleApprove = () => {
      onChange({
        state: 'submitted',
        result: { status: 'approved' },
      });
    };

    const handleEdit = (editedArgs: any) => {
      onChange({
        state: 'edited',
        result: { status: 'edited', editedArgs },
      });
    };

    const handleReject = (message: string) => {
      onChange({
        state: 'cancelled',
        result: { status: 'rejected', message },
      });
    };

    // 构造 ApprovalRequest 格式的对象
    const request = {
      id: interaction.id,
      toolCall: content.toolCall,
      status: interaction.state === 'submitted' ? 'approved' :
        interaction.state === 'edited' ? 'edited' :
          interaction.state === 'cancelled' ? 'rejected' : 'pending',
      createdAt: interaction.createdAt,
      messageIndex: metadata.messageIndex,
      description: metadata.description,
    };

    return (
      <ApprovalItem
        key={interaction.id}
        request={request as any}
        allowedDecisions={['approve', 'edit', 'reject']}
        onApprove={handleApprove}
        onEdit={handleEdit}
        onReject={handleReject}
        autoFocus={true}
      />
    );
  },

  /**
   * 默认配置
   */
  defaultConfig: {
    layout: {
      border: false,
      padding: 0,
    },
    interaction: {
      autoSubmit: false,
      allowSkip: false,
    },
  },
};

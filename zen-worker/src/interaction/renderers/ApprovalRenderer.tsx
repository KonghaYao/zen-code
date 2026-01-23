/**
 * 审批渲染器 (Web 版本)
 * 渲染审批类型的交互内容
 */

import React, { useState } from 'react';
import type { InteractionRenderer } from '../types';
import type { ApprovalContent } from '../content';
import type { PanelInteraction } from '../types';

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
    const [selectedAction, setSelectedAction] = useState<'approve' | 'edit' | 'reject' | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const [hasSubmitted, setHasSubmitted] = useState(false);

    const handleActionSelect = (action: 'approve' | 'edit' | 'reject') => {
      if (hasSubmitted) return;

      if (action === 'approve') {
        setHasSubmitted(true);
        onChange({
          state: 'submitted',
          result: { status: 'approved' },
        });
        return;
      }

      setSelectedAction(action);
      setIsEditing(true);

      if (action === 'edit') {
        setEditValue(JSON.stringify(content.toolCall.args, null, 2));
      } else {
        setEditValue('');
      }
    };

    const handleEditSubmit = () => {
      if (hasSubmitted || !editValue.trim()) return;

      setHasSubmitted(true);
      setIsEditing(false);

      if (selectedAction === 'edit') {
        try {
          const editedArgs = JSON.parse(editValue);
          onChange({
            state: 'edited',
            result: { status: 'edited', editedArgs },
          });
        } catch (error) {
          console.error('Invalid JSON:', error);
          alert('无效的 JSON 格式');
          setHasSubmitted(false);
        }
      } else if (selectedAction === 'reject') {
        onChange({
          state: 'cancelled',
          result: { status: 'rejected', message: editValue || 'User rejected to run this tool' },
        });
      }
    };

    const handleEditCancel = () => {
      setIsEditing(false);
      setSelectedAction(null);
      setEditValue('');
    };

    const actionButtons = [
      { label: 'Approve', value: 'approve' as const, color: 'bg-green-500 hover:bg-green-600' },
      { label: 'Edit', value: 'edit' as const, color: 'bg-yellow-500 hover:bg-yellow-600' },
      { label: 'Reject', value: 'reject' as const, color: 'bg-red-500 hover:bg-red-600' },
    ];

    const renderActionSelector = () => (
      <div className="space-y-3">
        {/* 工具信息 */}
        <div className="mb-3">
          <div className="text-cyan-700 font-medium text-lg">
            {content.toolCall.name}
          </div>
          {metadata?.description && (
            <div className="text-gray-600 text-sm mt-1">
              {metadata.description}
            </div>
          )}
          <div className="mt-2 p-3 bg-gray-50 rounded border">
            <pre className="text-xs text-gray-700 overflow-auto">
              {JSON.stringify(content.toolCall.args, null, 2)}
            </pre>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          {actionButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => handleActionSelect(btn.value)}
              disabled={hasSubmitted}
              className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors font-medium ${btn.color} ${
                hasSubmitted ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    );

    const renderEditUI = () => {
      const isEditMode = selectedAction === 'edit';
      const actionColor = isEditMode ? 'yellow' : 'red';

      return (
        <div className="space-y-3">
          <div className="mb-3">
            <div className={`text-${actionColor}-700 font-medium text-lg`}>
              {selectedAction!.toUpperCase()} MODE - {content.toolCall.name}
            </div>
          </div>

          {isEditMode ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                编辑工具参数 (JSON 格式)
              </label>
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="输入 JSON..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm font-mono"
                rows={10}
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                拒绝原因
              </label>
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="输入拒绝原因..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                rows={3}
              />
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleEditSubmit}
              disabled={!editValue.trim() || hasSubmitted}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {hasSubmitted ? '已提交' : '确认'}
            </button>
            <button
              onClick={handleEditCancel}
              disabled={hasSubmitted}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              取消
            </button>
          </div>

          <div className="text-xs text-gray-500">
            <span className="font-medium text-blue-600">↵</span> 提交 |
            <span className="font-medium text-red-600"> Esc</span> 取消
          </div>
        </div>
      );
    };

    return (
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        {isEditing ? renderEditUI() : renderActionSelector()}
      </div>
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

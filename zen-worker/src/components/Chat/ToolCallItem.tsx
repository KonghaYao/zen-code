/**
 * ToolCallItem - 工具调用组件
 * 参照 zen-code 的 MessageTool 组件
 */

import React from 'react';
import type { RenderMessage } from '@langgraph-js/sdk';
import { getMessageContent } from '@langgraph-js/sdk';

export interface ToolCallItemProps {
  message: RenderMessage;
  messageNumber: number;
}

export const ToolCallItem: React.FC<ToolCallItemProps> = ({ message, messageNumber }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  // 获取工具名称
  const toolName = (message as any).name || 'Unknown Tool';

  // 获取状态
  const status = (message as any).status || 'pending';

  // 获取内容
  const content = getMessageContent(message.content);

  // 获取输入参数（如果有）
  const inputArgs = (message as any).input;

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
      case 'completed':
        return '✅';
      case 'error':
      case 'failed':
        return '❌';
      case 'running':
      case 'in_progress':
        return '🔄';
      default:
        return '⏳';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'error':
      case 'failed':
        return 'border-red-200 bg-red-50';
      case 'running':
      case 'in_progress':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-yellow-200 bg-yellow-50';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'success':
      case 'completed':
        return '已完成';
      case 'error':
      case 'failed':
        return '失败';
      case 'running':
      case 'in_progress':
        return '执行中';
      default:
        return '等待中';
    }
  };

  return (
    <div className={`flex items-start gap-3 ${getStatusColor()} rounded-lg p-3 border`}>
      <div className="flex-shrink-0 text-lg">{getStatusIcon()}</div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="font-medium text-gray-800">
            {messageNumber} {toolName}
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            {isExpanded ? '收起' : '展开'}
          </button>
        </div>

        <div className="text-xs text-gray-500 mb-1">
          状态: <span className="font-medium">{getStatusText()}</span>
        </div>

        {/* 输入参数 */}
        {inputArgs && isExpanded && (
          <div className="mb-2">
            <div className="text-sm font-medium text-gray-700 mb-1">参数</div>
            <pre className="bg-white p-2 rounded text-xs overflow-x-auto">
              {JSON.stringify(inputArgs, null, 2)}
            </pre>
          </div>
        )}

        {/* 输出内容 */}
        {content && (
          <div className={isExpanded ? '' : 'line-clamp-3'}>
            <pre className="text-xs whitespace-pre-wrap break-words">
              {content}
            </pre>
          </div>
        )}

        {/* 执行中动画 */}
        {status === 'running' && (
          <div className="flex items-center gap-2 mt-2">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
            <span className="text-xs text-blue-700">正在执行...</span>
          </div>
        )}
      </div>
    </div>
  );
};

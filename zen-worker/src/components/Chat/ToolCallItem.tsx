/**
 * ToolCallItem - 工具调用组件
 * 参照 zen-code 的 MessageTool 组件
 */

import React from 'react';
import type { RenderMessage } from '@langgraph-js/sdk';
import { getMessageContent } from '@langgraph-js/sdk';
import { JSONViewer } from '../common/JSONViewer';
import { useToolMetadata } from './ToolRegistry';

export interface ToolCallItemProps {
  message: RenderMessage;
  messageNumber: number;
}

export const ToolCallItem: React.FC<ToolCallItemProps> = ({ message, messageNumber }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  // 获取工具名称
  const toolName = (message as any).name || 'Unknown Tool';

  // 使用工具元数据
  const { displayName, icon, color, metadata } = useToolMetadata(toolName);

  // 获取状态
  const status = (message as any).status || 'pending';

  // 获取内容
  const content = getMessageContent(message.content);

  // 获取输入参数（如果有）
  const inputArgs = (message as any).input;

  // 获取工具调用的原始数据（用于显示参数）
  const toolCalls = (message as any).tool_calls;
  const toolCallArgs = toolCalls?.[0]?.args || inputArgs;

  // 自定义渲染器
  const CustomRenderer = metadata?.customRenderer;

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
      case 'interrupted':
        return '⏸️';
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
      case 'interrupted':
        return 'border-yellow-300 bg-yellow-50';
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
      case 'interrupted':
        return '等待审批';
      default:
        return '等待中';
    }
  };

  // 如果有自定义渲染器，使用它
  if (CustomRenderer) {
    return <CustomRenderer message={message} />;
  }

  return (
    <div className={`flex items-start gap-3 ${getStatusColor()} rounded-lg p-3 border`}>
      <div className="flex-shrink-0 text-lg">{icon || getStatusIcon()}</div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="font-medium text-gray-800">
            {messageNumber}. {displayName}
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
          {metadata?.description && (
            <span className="ml-2">| {metadata.description}</span>
          )}
        </div>

        {/* 输入参数 */}
        {toolCallArgs && isExpanded && (
          <div className="mb-2">
            <div className="text-sm font-medium text-gray-700 mb-1">参数</div>
            <div className="bg-white p-2 rounded border border-gray-200">
              <JSONViewer data={toolCallArgs} maxDepth={3} />
            </div>
          </div>
        )}

        {/* 输出内容 */}
        {content && (
          <div className={isExpanded ? '' : 'line-clamp-3'}>
            <div className="text-xs text-gray-600 mb-1">输出</div>
            <pre className="text-xs whitespace-pre-wrap break-words bg-white p-2 rounded border border-gray-200">
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

        {/* 等待审批提示 */}
        {status === 'interrupted' && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-yellow-600">⏸️ 等待用户审批...</span>
          </div>
        )}
      </div>
    </div>
  );
};

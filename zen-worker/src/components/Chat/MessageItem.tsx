/**
 * MessageItem - 消息组件
 * 参照 zen-code 的 MessageAI、MessageHuman、MessageTool 组件
 * 使用 RenderMessage 类型
 */

import React from 'react';
import type { RenderMessage } from '@langgraph-js/sdk';
import { getTextContent, getThinkingContent } from '@langgraph-js/sdk';
import { ToolCallItem } from './ToolCallItem';

export interface MessageItemProps {
  message: RenderMessage;
  messageNumber: number;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, messageNumber }) => {
  const messageType = message.type;

  // Tool 消息
  if (messageType === 'tool') {
    return <ToolCallItem message={message} messageNumber={messageNumber} />;
  }

  // Human 消息
  if (messageType === 'human') {
    return (
      <div className="flex items-start gap-3 flex-row-reverse">
        <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
          👤
        </div>

        <div className="flex-1 bg-green-50 rounded-lg p-3 max-w-[80%]">
          <div className="text-xs text-gray-500 mb-1 font-medium">
            {messageNumber} 你
          </div>
          <div className="text-gray-800 whitespace-pre-wrap break-words">
            {getTextContent(message) || ''}
          </div>
        </div>
      </div>
    );
  }

  // AI 消息
  if (messageType === 'ai') {
    const thinkingContent = getThinkingContent(message);
    const textContent = getTextContent(message) || '';

    return (
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
          🤖
        </div>

        <div className="flex-1 bg-blue-50 rounded-lg p-3 max-w-[80%]">
          <div className="text-xs text-gray-500 mb-1 font-medium">
            {messageNumber} AI 助手
          </div>

          {/* Thinking 内容 */}
          {thinkingContent && (
            <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
              <div className="font-medium text-yellow-800 mb-1">💭 思考过程</div>
              <div className="text-yellow-700 text-xs whitespace-pre-wrap line-clamp-3">
                {thinkingContent}
              </div>
            </div>
          )}

          {/* 文本内容 */}
          <div className="text-gray-800 whitespace-pre-wrap break-words">
            {formatMarkdown(textContent)}
          </div>

          {/* Artifact */}
          {(message as any).artifact && (
            <div className="mt-2">
              {(message as any).artifact}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 未知消息类型
  return null;
};

/**
 * 简单的 Markdown 格式化（仅处理代码块）
 */
const formatMarkdown = (content: string): React.ReactNode => {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // 添加代码块前的文本
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`} className="whitespace-pre-wrap">
          {content.substring(lastIndex, match.index)}
        </span>
      );
    }

    // 添加代码块
    const language = match[1] || 'text';
    const code = match[2];
    parts.push(
      <pre key={`code-${match.index}`} className="bg-gray-800 text-gray-100 p-3 rounded-lg overflow-x-auto my-2">
        <code className={`language-${language}`}>{code}</code>
      </pre>
    );

    lastIndex = match.index + match[0].length;
  }

  // 添加剩余的文本
  if (lastIndex < content.length) {
    parts.push(
      <span key={`text-${lastIndex}`} className="whitespace-pre-wrap">
        {content.substring(lastIndex)}
      </span>
    );
  }

  return parts.length > 0 ? parts : content;
};

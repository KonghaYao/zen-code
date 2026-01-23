/**
 * ChatPage - 聊天页面
 * 参照 zen-code 实现，使用 RenderMessage 类型
 */

import React, { useEffect, useRef } from 'react';
import { useChat } from '@langgraph-js/sdk/react';
import { Button } from '../components/common/Button';
import { MessageItem } from '../components/Chat/MessageItem';
import { useSettings } from '@codegraph/union-client';


export function ChatPage() {
  const {
    renderMessages,
    userInput,
    loading,
    inChatError,
    setUserInput,
    sendMessage,
    stopGeneration,
  } = useChat();
  const { extraParams } = useSettings()

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [renderMessages]);

  // 自动聚焦输入框
  useEffect(() => {
    if (!loading) {
      textareaRef.current?.focus();
    }
  }, [loading]);

  const handleSend = async () => {
    if (!userInput.trim() || loading) return;
    await sendMessage([
      {
        type: 'human',
        content: userInput,
      },
    ], { extraParams });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        {renderMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <p className="text-lg mb-2">欢迎使用 Zen Worker</p>
              <p className="text-sm">开始输入消息与 AI 助手对话</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {renderMessages.map((message, index) => (
              <MessageItem
                key={`${message.id}-${index}`}
                message={message}
                messageNumber={index + 1}
              />
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
                  🤖
                </div>
                <div className="flex-1 bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    <p className="text-sm text-gray-600">思考中...</p>
                  </div>
                </div>
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Error */}
        {inChatError && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{inChatError}</p>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t bg-white p-4">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
              disabled={loading}
              rows={1}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              style={{ minHeight: '48px', maxHeight: '200px' }}
            />
            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
              按 Enter 发送，Shift + Enter 换行
            </div>
          </div>
          <Button
            onClick={handleSend}
            disabled={loading || !userInput.trim()}
            isLoading={loading}
            className="px-6 self-end"
          >
            {loading ? '发送中...' : '发送'}
          </Button>
          {loading && (
            <Button
              variant="danger"
              onClick={stopGeneration}
              className="self-end"
            >
              停止
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

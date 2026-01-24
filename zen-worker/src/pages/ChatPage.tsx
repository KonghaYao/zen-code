/**
 * ChatPage - 聊天页面
 * Claude 风格设计
 */

import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '@langgraph-js/sdk/react';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { ArrowUpIcon, Loader2, StopCircleIcon, User, Bot } from 'lucide-react';
import { cn } from '../lib/utils';

import { useSettings } from '@codegraph/union-client';
import { useApprovalIntegration } from '../hooks/useApprovalIntegration';
import { UnifiedUIPanel } from '../interaction';
import { useInteractionContext } from '../interaction';
import DefaultTools from '../tools';
import { Streamdown } from 'streamdown';
import { code } from '@streamdown/code';
import { math } from '@streamdown/math';
import { mermaid } from '@streamdown/mermaid';
import { cjk } from '@streamdown/cjk';


export function ChatPage() {
  const {
    renderMessages,
    userInput,
    loading,
    inChatError,
    setUserInput,
    sendMessage,
    stopGeneration,
    setTools,
  } = useChat();
  const { extraParams } = useSettings();

  useEffect(() => {
    setTools(DefaultTools);
  }, [setTools]);

  useApprovalIntegration();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { hasPendingInteractions } = useInteractionContext();
  const [autoResize, setAutoResize] = useState(false);

  useEffect(() => {
    if (!loading && !hasPendingInteractions) {
      textareaRef.current?.focus();
    }
  }, [loading, hasPendingInteractions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [renderMessages, loading]);

  const handleSend = async () => {
    if (!userInput.trim() || loading) return;
    await sendMessage([
      {
        type: 'human',
        content: userInput,
      },
    ], { extraParams });
    setUserInput('');
    setAutoResize(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    setAutoResize(target.value.length > 0);
    setUserInput(target.value);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* 统一交互面板 */}
          {hasPendingInteractions && (
            <div className="mb-6">
              <UnifiedUIPanel />
            </div>
          )}

          {renderMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[60vh]">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                  <Bot className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Zen Worker</h2>
                  <p className="text-muted-foreground">我是你的 AI 助手，有什么可以帮你的吗？</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {renderMessages.map((message, index) => (
                <MessageBubble
                  key={`${message.id}-${index}`}
                  message={message}
                />
              ))}

              {/* Loading indicator */}
              {loading && (
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 pt-2">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Error */}
          {inChatError && (
            <div className="my-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{inChatError}</p>
            </div>
          )}
        </div>
      </div>

      {/* Input Area - Claude 风格 */}
      {!hasPendingInteractions && (
        <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="max-w-3xl mx-auto p-4">
            <div className="relative flex items-end gap-2 bg-muted/50 rounded-3xl p-2 border border-border shadow-sm">
              <Textarea
                ref={textareaRef}
                value={userInput}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="发送消息给 Zen Worker..."
                disabled={loading}
                rows={autoResize ? undefined : 1}
                className="min-h-[44px] max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:shadow-none px-4 py-3 text-base"
                style={{ height: autoResize ? 'auto' : '44px' }}
              />
              <div className="flex items-center gap-1 pb-1 pr-1">
                {loading ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={stopGeneration}
                    className="h-9 w-9 rounded-full flex-shrink-0"
                  >
                    <StopCircleIcon className="w-5 h-5" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSend}
                    disabled={!userInput.trim()}
                    size="icon"
                    className="h-9 w-9 rounded-full flex-shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <ArrowUpIcon className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Enter 发送，Shift + Enter 换行
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Claude 风格消息气泡
interface MessageBubbleProps {
  message: any;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isHuman = message.type === 'human';
  const getContent = () => {
    if (typeof message.content === 'string') {
      return message.content;
    }
    if (Array.isArray(message.content)) {
      return message.content
        .map((item: any) => {
          if (item.type === 'text') return item.text;
          if (item.type === 'tool-use') return `[使用工具: ${item.name}]`;
          if (item.type === 'tool-result') return `[工具结果]`;
          return '';
        })
        .join('\n');
    }
    return JSON.stringify(message.content);
  };

  const content = getContent();

  return (
    <div className={cn(
      "flex gap-4",
      isHuman ? "justify-end" : "justify-start"
    )}>
      {!isHuman && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="w-5 h-5 text-primary" />
        </div>
      )}

      <div className={cn(
        "flex-1 max-w-[85%] space-y-2",
        isHuman && "flex flex-col items-end"
      )}>
        <div className={cn(
          "text-sm",
          isHuman ? "text-muted-foreground" : "text-foreground"
        )}>
          {isHuman ? '你' : 'Zen Worker'}
        </div>

        <div className={cn(
          "text-base leading-relaxed",
          isHuman && "bg-secondary rounded-3xl px-4 py-3"
        )}>
          {isHuman ? (
            <div className="whitespace-pre-wrap">{content}</div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <Streamdown
                plugins={{ code, mermaid, math, cjk }}
              >
                {content}
              </Streamdown>
            </div>
          )}
        </div>
      </div>

      {isHuman && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
          <User className="w-5 h-5 text-foreground" />
        </div>
      )}
    </div>
  );
}

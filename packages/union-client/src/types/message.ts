/**
 * 消息相关类型定义
 */

export interface ParsedMessage {
  id: string;
  type: 'human' | 'ai' | 'system' | 'tool';
  content: string;
  thinking?: string;
  toolCalls?: any[];
  metadata?: Record<string, any>;
}

export interface MessageFormatOptions {
  showTimestamp?: boolean;
  showThinking?: boolean;
  compact?: boolean;
}

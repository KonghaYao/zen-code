/**
 * 消息格式化工具
 */
import type { ParsedMessage, MessageFormatOptions } from '../types/message.js';

export function formatMessage(
  message: ParsedMessage,
  options: MessageFormatOptions = {}
): string {
  const { showTimestamp = false, showThinking = true, compact = false } = options;

  let result = '';

  // 添加时间戳
  if (showTimestamp) {
    const timestamp = formatTimestamp(message.metadata?.timestamp || Date.now());
    result += `[${timestamp}] `;
  }

  // 添加内容类型标签
  switch (message.type) {
    case 'tool':
      result += `[Tool] ${message.content}`;
      break;
    case 'system':
      result += `[System] ${message.content}`;
      break;
    default:
      result += message.content;
  }

  // 添加思考内容
  if (showThinking && message.thinking) {
    result += `\n\nThinking: ${message.thinking}`;
  }

  return result;
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
}

/**
 * 解析 LangGraph SDK 消息
 */
export function parseMessage(message: any): ParsedMessage {
  // 基础解析逻辑
  // TODO: 根据 LangGraph SDK 的实际消息格式进行完整实现

  return {
    id: message.id || '',
    type: message.type || 'human',
    content: message.content || '',
    metadata: message.metadata || {},
  };
}

/**
 * 提取思考内容
 */
export function extractThinking(message: any): string | null {
  // TODO: 根据 LangGraph SDK 的实际格式提取思考内容
  if (message.thinking) {
    return message.thinking;
  }
  return null;
}

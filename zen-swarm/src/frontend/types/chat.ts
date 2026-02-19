/**
 * Chat Panel 类型定义
 */

import type { RenderMessage } from '@langgraph-js/sdk';

// 扩展 PanelType 添加 chat 选项
export type PanelType = 'agents' | 'models' | 'prompts' | 'tools' | 'middlewares' | 'mcp' | 'skills' | 'chat';

// 聊天消息类型
export type ChatMessage = RenderMessage;

// 聊天历史项
export interface ChatHistoryItem {
    id: string;
    title?: string;
    createdAt: string;
    updatedAt: string;
    metadata?: Record<string, any>;
}

// 聊天配置
export interface ChatConfig {
    apiUrl: string;
    defaultAgent?: string;
    defaultHeaders?: Record<string, string>;
    withCredentials?: boolean;
    showHistory?: boolean;
    showGraph?: boolean;
}

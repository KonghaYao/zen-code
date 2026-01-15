/**
 * 命令系统类型定义 - 重构后的简化版本
 */

import type { ModelConfig } from '../../../../agents/code/utils/get_allowed_models';

export interface CommandResult {
    /** 是否成功执行 */
    success: boolean;
    /** 结果消息 */
    message?: string;
    /** 是否应该发送消息到聊天 */
    shouldSendMessage?: boolean;
    /** 要发送的消息内容 */
    messageContent?: string;
    /** 是否应该清空输入框 */
    shouldClearInput?: boolean;
}

/**
 * CommandContext 接口 - 轻量级回调模式
 * 命令通过这些回调函数与 UI 和 SDK 交互，而不直接依赖 React Hooks
 */
export interface CommandContext {
    // ========== UI 操作 ==========
    /** 切换面板 */
    switchPanel: (panel: 'chat' | 'history' | 'knowledge' | 'model') => void;

    /** 显示通知（自动消失） */
    showNotification: (type: 'error' | 'success', message: string, duration?: number) => void;

    // ========== SDK 操作 ==========
    /** 发送消息到当前对话 */
    sendMessage: (content: string | unknown[], extraParams?: Record<string, unknown>) => Promise<void>;

    /** 创建新对话 */
    createChat: () => void;

    /** 更新配置 */
    updateConfig: (config: Record<string, unknown>) => Promise<void>;

    /** 清空输入框 */
    clearInput: () => void;

    /** 设置输入框内容 */
    setUserInput: (input: string) => void;

    // ========== 只读状态（用于命令逻辑判断） ==========
    /** 当前用户输入 */
    userInput: string;

    /** 当前代理 */
    currentAgent?: string;

    /** 可用模型列表 */
    AVAILABLE_MODELS?: ModelConfig[];

    /** 额外参数 */
    extraParams?: Record<string, unknown>;

    /** 渲染消息列表（用于总结等需要访问聊天记录的场景） */
    renderMessages?: unknown[];
}

export interface CommandDefinition {
    /** 命令名称（不包含 /） */
    name: string;
    /** 命令描述 */
    description: string;
    /** 命令别名 */
    aliases?: string[];
    /** 命令用法示例 */
    usage?: string;
    /** 是否需要参数 */
    requiresArgs?: boolean;
    /** 参数验证函数 */
    validateArgs?: (args: string[]) => boolean;
    /** 命令执行函数 */
    execute: (args: string[], context: CommandContext) => Promise<CommandResult> | CommandResult;
}

export interface CommandSuggestion {
    /** 命令名称 */
    command: string;
    /** 匹配的参数 */
    args?: string[];
    /** 显示文本 */
    displayText: string;
    /** 描述 */
    description: string;
}

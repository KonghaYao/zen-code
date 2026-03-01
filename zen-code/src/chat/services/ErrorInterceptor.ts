/**
 * ErrorInterceptor - 全局错误拦截器
 *
 * 拦截所有错误源并存储到 ErrorStore:
 * - console.error / console.warn
 * - unhandledrejection
 * - uncaughtException
 */

import { errorStore, type ErrorEntry } from './ErrorStore';

type ErrorSource = ErrorEntry['source'];
type ErrorLevel = ErrorEntry['level'];

/**
 * 从错误堆栈中提取文件位置信息
 */
function extractFileLocation(error: Error): { file?: string; line?: number; column?: number } {
    const stack = error.stack;
    if (!stack) return {};

    // 匹配常见的堆栈格式
    // 格式1: at functionName (file:line:column)
    // 格式2: at file:line:column
    const lineMatch = stack.match(/at\s+(?:.*?\s+)?\(?(.+?):(\d+):(\d+)\)?/);
    if (lineMatch) {
        return {
            file: lineMatch[1],
            line: parseInt(lineMatch[2], 10),
            column: parseInt(lineMatch[3], 10),
        };
    }

    return {};
}

/**
 * 推断错误来源
 */
function inferSource(message: string, error?: Error): ErrorSource {
    const msg = message.toLowerCase();

    // 根据关键词推断来源
    if (
        msg.includes('tool') ||
        msg.includes('read') ||
        msg.includes('write') ||
        msg.includes('glob') ||
        msg.includes('grep')
    ) {
        return 'Tool';
    }
    if (msg.includes('terminal') || msg.includes('bash') || msg.includes('command') || msg.includes('spawn')) {
        return 'Terminal';
    }
    if (msg.includes('agent') || msg.includes('llm') || msg.includes('model')) {
        return 'Agent';
    }
    if (msg.includes('config') || msg.includes('network') || msg.includes('fetch')) {
        return 'System';
    }

    // 检查堆栈中的信息
    if (error?.stack) {
        const stack = error.stack.toLowerCase();
        if (stack.includes('tool') || stack.includes('filesystem')) {
            return 'Tool';
        }
        if (stack.includes('terminal') || stack.includes('bash')) {
            return 'Terminal';
        }
        if (stack.includes('agent') || stack.includes('graph')) {
            return 'Agent';
        }
    }

    return 'Unknown';
}

/**
 * 记录错误
 */
function logError(level: ErrorLevel, message: string, source?: ErrorSource, error?: Error): void {
    const inferredSource = source || inferSource(message, error);
    const location = error ? extractFileLocation(error) : {};

    errorStore.addError({
        level,
        source: inferredSource,
        message,
        file: location.file,
        line: location.line,
        column: location.column,
        stack: error?.stack,
    });
}

// 保存原始的 console 方法
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

/**
 * 拦截 console.error
 */
function interceptedConsoleError(...args: any[]): void {
    // 调用原始方法
    originalConsoleError.apply(console, args);

    try {
        // 提取错误信息
        const message = args
            .map((arg) => {
                if (typeof arg === 'string') return arg;
                if (arg instanceof Error) return arg.message;
                try {
                    return JSON.stringify(arg);
                } catch {
                    return String(arg);
                }
            })
            .join(' ');

        // 查找 Error 对象
        const errorObj = args.find((arg) => arg instanceof Error);

        logError('error', message, undefined, errorObj);
    } catch {
        // 拦截器自身出错时静默处理，避免循环错误
    }
}

/**
 * 拦截 console.warn
 */
function interceptedConsoleWarn(...args: any[]): void {
    // 调用原始方法
    originalConsoleWarn.apply(console, args);

    try {
        // 提取警告信息
        const message = args
            .map((arg) => {
                if (typeof arg === 'string') return arg;
                if (arg instanceof Error) return arg.message;
                try {
                    return JSON.stringify(arg);
                } catch {
                    return String(arg);
                }
            })
            .join(' ');

        logError('warning', message, undefined);
    } catch {
        // 拦截器自身出错时静默处理，避免循环错误
    }
}

/**
 * 处理未捕获的 Promise 拒绝
 */
function handleUnhandledRejection(reason: unknown): void {
    let message: string;
    let error: Error | undefined;

    if (reason instanceof Error) {
        message = reason.message;
        error = reason;
    } else if (typeof reason === 'string') {
        message = reason;
    } else {
        try {
            message = JSON.stringify(reason);
        } catch {
            message = String(reason);
        }
    }

    logError('error', `[UnhandledRejection] ${message}`, 'System', error);
}

/**
 * 处理未捕获的异常
 */
function handleUncaughtException(error: unknown): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logError('error', `[UncaughtException] ${errorObj.message}`, 'System', errorObj);
}

let isInitialized = false;

/**
 * 初始化错误拦截器
 */
export function initErrorInterceptor(): void {
    if (isInitialized) return;

    // 拦截 console 方法
    console.error = interceptedConsoleError;
    console.warn = interceptedConsoleWarn;

    // 监听未处理的 Promise 拒绝
    process.on('unhandledRejection', handleUnhandledRejection);

    // 监听未捕获的异常
    process.on('uncaughtException', handleUncaughtException);

    isInitialized = true;
}

/**
 * 停止错误拦截（用于测试或清理）
 */
export function stopErrorInterceptor(): void {
    if (!isInitialized) return;

    // 恢复原始 console 方法
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;

    // 移除监听器
    process.off('unhandledRejection', handleUnhandledRejection);
    process.off('uncaughtException', handleUncaughtException);

    isInitialized = false;
}

/**
 * 手动记录工具错误（供外部调用）
 */
export function logToolError(toolName: string, error: Error | string): void {
    const message = typeof error === 'string' ? error : error.message;
    const errorObj = typeof error === 'string' ? undefined : error;
    logError('error', `[${toolName}] ${message}`, 'Tool', errorObj);
}

/**
 * 手动记录终端错误（供外部调用）
 */
export function logTerminalError(command: string, error: Error | string): void {
    const message = typeof error === 'string' ? error : error.message;
    const errorObj = typeof error === 'string' ? undefined : error;
    logError('error', `[Terminal] ${command}: ${message}`, 'Terminal', errorObj);
}

/**
 * 手动记录 Agent 错误（供外部调用）
 */
export function logAgentError(agentName: string, error: Error | string): void {
    const message = typeof error === 'string' ? error : error.message;
    const errorObj = typeof error === 'string' ? undefined : error;
    logError('error', `[Agent:${agentName}] ${message}`, 'Agent', errorObj);
}

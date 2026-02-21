/**
 * Tool Message Component
 * 显示工具调用消息（折叠式设计）
 * 默认只显示简洁的 bar，点击展开查看详细内容
 */

import React, { useState } from 'react';
import type { RenderMessage } from '@langgraph-js/sdk';

interface ToolMessageProps {
    message: RenderMessage;
    messageNumber: number;
}

export const ToolMessage: React.FC<ToolMessageProps> = ({ message, messageNumber }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    /** @ts-ignore */
    const toolName = message.name || 'Unknown Tool';
    /** @ts-ignore */
    const status = message.status || message.done !== false ? 'success' : 'running';
    /** @ts-ignore */
    const toolOutput = message.content;

    const statusStyles = {
        success: {
            icon: '✓',
            color: 'text-green-500',
            bg: 'bg-green-50',
        },
        running: {
            icon: '⏳',
            color: 'text-amber-500',
            bg: 'bg-amber-50',
        },
        error: {
            icon: '✗',
            color: 'text-red-500',
            bg: 'bg-red-50',
        },
    };

    const style = statusStyles[status as keyof typeof statusStyles] || statusStyles.running;

    return (
        <div className="mb-1">
            {/* 简洁的工具栏 Bar */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors text-left group"
            >
                <span className={`text-xs ${style.color}`}>{style.icon}</span>
                <span className="text-xs text-gray-400 font-mono">#{messageNumber}</span>
                <span className="text-sm font-medium text-gray-700 truncate flex-1">{toolName}</span>
                <span
                    className={`text-xs text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                >
                    ▼
                </span>
            </button>

            {/* 展开的详细内容 */}
            {isExpanded ? (
                <div className="mt-1 px-3 py-2 text-xs font-mono overflow-x-auto bg-gray-50 rounded-md border border-gray-200 text-gray-600">
                    {toolOutput && typeof toolOutput === 'string' ? (
                        <pre className="whitespace-pre-wrap">{toolOutput}</pre>
                    ) : (
                        <pre className="whitespace-pre-wrap">{JSON.stringify(toolOutput, null, 2)}</pre>
                    )}
                </div>
            ) : null}
        </div>
    );
};

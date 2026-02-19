/**
 * Tool Message Component
 * 显示工具调用消息（深色主题）
 */

import React from 'react';
import type { RenderMessage } from '@langgraph-js/sdk';

interface ToolMessageProps {
    message: RenderMessage;
    messageNumber: number;
}

export const ToolMessage: React.FC<ToolMessageProps> = ({ message, messageNumber }) => {
    /** @ts-ignore */
    const toolName = message.name || 'Unknown Tool';
    /** @ts-ignore */
    const status = message.status || message.done !== false ? 'success' : 'running';
    /** @ts-ignore */
    const toolOutput = message.content;

    const statusStyles = {
        success: {
            text: 'text-green-400',
            bg: 'bg-green-900/30',
            border: 'border-green-700/50',
            icon: '✓',
        },
        running: {
            text: 'text-yellow-400',
            bg: 'bg-yellow-900/30',
            border: 'border-yellow-700/50',
            icon: '⏳',
        },
        error: {
            text: 'text-red-400',
            bg: 'bg-red-900/30',
            border: 'border-red-700/50',
            icon: '✗',
        },
    };

    const style = statusStyles[status as keyof typeof statusStyles] || statusStyles.running;

    return (
        <div className={`flex flex-col border rounded ${style.bg} ${style.border} mb-2`}>
            <div className={`font-bold px-3 py-1 flex items-center gap-2 ${style.text}`}>
                <span>{style.icon}</span>
                <span>
                    {messageNumber}. Tool: {toolName}
                </span>
            </div>
            <div className="px-3 py-2 text-sm font-mono overflow-x-auto text-gray-200">
                {toolOutput && typeof toolOutput === 'string' ? (
                    <pre className="whitespace-pre-wrap">{toolOutput}</pre>
                ) : (
                    <pre className="whitespace-pre-wrap">{JSON.stringify(toolOutput, null, 2)}</pre>
                )}
            </div>
        </div>
    );
};

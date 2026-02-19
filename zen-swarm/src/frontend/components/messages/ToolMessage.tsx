/**
 * Tool Message Component
 * 显示工具调用消息
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

    const statusColors = {
        success: 'text-green-600 bg-green-50 border-green-200',
        running: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        error: 'text-red-600 bg-red-50 border-red-200',
    };

    const statusIcons = {
        success: '✓',
        running: '⏳',
        error: '✗',
    };

    const colorClass = statusColors[status as keyof typeof statusColors] || statusColors.running;
    const statusIcon = statusIcons[status as keyof typeof statusIcons] || statusIcons.running;

    return (
        <div className={`flex flex-col border rounded ${colorClass} mb-2`}>
            <div className="font-bold px-3 py-1 flex items-center gap-2">
                <span>{statusIcon}</span>
                <span>
                    {messageNumber}. Tool: {toolName}
                </span>
            </div>
            <div className="px-3 py-2 text-sm font-mono overflow-x-auto">
                {toolOutput && typeof toolOutput === 'string' ? (
                    <pre className="whitespace-pre-wrap">{toolOutput}</pre>
                ) : (
                    <pre className="whitespace-pre-wrap">{JSON.stringify(toolOutput, null, 2)}</pre>
                )}
            </div>
        </div>
    );
};

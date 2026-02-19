/**
 * Tool Message Component
 * 显示工具调用消息（极简风格）
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
            badge: 'badge-success',
            icon: '✓',
            label: 'Success',
        },
        running: {
            badge: 'badge-warning',
            icon: '⏳',
            label: 'Running',
        },
        error: {
            badge: 'badge-error',
            icon: '✗',
            label: 'Error',
        },
    };

    const style = statusStyles[status as keyof typeof statusStyles] || statusStyles.running;

    return (
        <div className="flex flex-col border border-[var(--color-border-subtle)] rounded-lg bg-[var(--color-bg-secondary)] mb-2 animate-slide-in">
            <div className="px-4 py-2.5 flex items-center gap-3 border-b border-[var(--color-border-subtle)]">
                <span className="text-sm">{style.icon}</span>
                <span className="text-sm text-[var(--color-text-muted)]">#{messageNumber}</span>
                <span className={style.badge}>{style.label}</span>
                <span className="ml-auto text-sm font-medium text-[var(--color-text-primary)]">{toolName}</span>
            </div>
            <div className="px-4 py-3 text-sm font-mono overflow-x-auto text-[var(--color-text-secondary)]">
                {toolOutput && typeof toolOutput === 'string' ? (
                    <pre className="whitespace-pre-wrap">{toolOutput}</pre>
                ) : (
                    <pre className="whitespace-pre-wrap">{JSON.stringify(toolOutput, null, 2)}</pre>
                )}
            </div>
        </div>
    );
};

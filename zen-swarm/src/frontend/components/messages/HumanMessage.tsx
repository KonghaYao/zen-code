/**
 * Human Message Component
 * 显示用户消息（极简风格）
 */

import React from 'react';
import type { RenderMessage } from '@langgraph-js/sdk';

interface HumanMessageProps {
    message: RenderMessage;
    messageNumber: number;
}

export const HumanMessage: React.FC<HumanMessageProps> = ({ message, messageNumber }) => {
    // Handle different content types
    const renderContent = () => {
        if (typeof message.content === 'string') {
            return message.content;
        }

        if (Array.isArray(message.content)) {
            // Handle content array (e.g., with text blocks)
            const textParts = message.content
                .filter((item: any) => item.type === 'text')
                .map((item: any) => item.text)
                .join('');
            return textParts || JSON.stringify(message.content);
        }

        if (message.content && typeof message.content === 'object') {
            // Handle object with error/message keys
            if ('error' in message.content || 'message' in message.content) {
                const content = message.content as any;
                return content.message || content.error || JSON.stringify(message.content);
            }
        }

        // Fallback
        return JSON.stringify(message.content);
    };

    const content = renderContent();

    return (
        <div className="flex flex-col animate-slide-in">
            <div className="text-xs text-[var(--color-text-muted)] mb-2">Message #{messageNumber} · You</div>
            <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] p-4 rounded-lg text-[var(--color-text-primary)] leading-relaxed">
                {content}
            </div>
        </div>
    );
};

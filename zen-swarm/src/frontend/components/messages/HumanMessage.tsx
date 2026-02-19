/**
 * Human Message Component
 * 显示用户消息
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
        <div className="flex flex-col">
            <div className="font-bold text-amber-600 mb-1">{messageNumber}. User</div>
            <div className="bg-gray-50 p-2 rounded text-gray-800">{content}</div>
        </div>
    );
};

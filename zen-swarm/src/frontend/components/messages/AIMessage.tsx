/**
 * AI Message Component
 * 显示AI回复消息（包含thinking和Markdown内容）
 */

import React, { useState } from 'react';
import type { RenderMessage } from '@langgraph-js/sdk';
import { getThinkingContent, getTextContent } from '@langgraph-js/sdk';

interface AIMessageProps {
    message: RenderMessage;
    messageNumber: number;
    modelName?: string;
}

export const AIMessage: React.FC<AIMessageProps> = ({ message, messageNumber, modelName = 'AI' }) => {
    const [showThinking, setShowThinking] = useState(false);

    // 提取thinking内容
    const thinkingContent = getThinkingContent(message);

    // 提取文本内容
    /** @ts-ignore */
    let textContent = getTextContent(message);

    // Handle different content types
    const renderTextContent = (): string => {
        if (!textContent) return '';

        if (typeof textContent === 'string') {
            return textContent;
        }

        // Handle object with error/message keys
        if (textContent && typeof textContent === 'object') {
            if ('error' in textContent || 'message' in textContent) {
                const content = textContent as any;
                return content.message || content.error || JSON.stringify(textContent);
            }
        }

        // Fallback for arrays and other types
        if (Array.isArray(textContent)) {
            return (
                (textContent as any[])
                    .filter((item: any) => item?.type === 'text')
                    .map((item: any) => item?.text || '')
                    .join('') || JSON.stringify(textContent)
            );
        }

        // Fallback
        return JSON.stringify(textContent);
    };

    const displayContent = renderTextContent();

    return (
        <div className="flex flex-col">
            <div className="font-bold text-teal-600 mb-1">
                {messageNumber}. {modelName}
            </div>

            {/* Thinking区域 */}
            {thinkingContent && (
                <details
                    className="mb-2 cursor-pointer"
                    open={showThinking}
                    onToggle={(e) => setShowThinking((e.target as HTMLDetailsElement).open)}
                >
                    <summary className="text-gray-500 hover:text-gray-700 select-none mb-1">
                        💭 Thinking ({thinkingContent.split('\n').length} rows)
                    </summary>
                    <pre className="bg-gray-900 text-green-400 p-3 rounded text-sm overflow-x-auto whitespace-pre-wrap">
                        {thinkingContent}
                    </pre>
                </details>
            )}

            {/* 消息内容 */}
            <div className="bg-teal-50 p-3 rounded text-gray-800 prose prose-sm max-w-none">
                {displayContent || '<Thinking...>'}
            </div>
        </div>
    );
};

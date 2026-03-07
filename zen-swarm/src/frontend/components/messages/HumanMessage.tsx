/**
 * Human Message Component
 * 显示用户消息，带有视觉区分和清晰层次感
 */

import React from 'react';
import type { RenderMessage } from '@langgraph-js/sdk';

interface HumanMessageProps {
    message: RenderMessage;
    messageNumber: number;
}

function extractContent(content: unknown): string {
    if (typeof content === 'string') return content;

    if (Array.isArray(content)) {
        const text = content
            .filter((item: any) => item?.type === 'text')
            .map((item: any) => item.text)
            .join('');
        return text || JSON.stringify(content);
    }

    if (content && typeof content === 'object') {
        const obj = content as Record<string, unknown>;
        if (obj.message) return String(obj.message);
        if (obj.error) return String(obj.error);
    }

    return JSON.stringify(content);
}

export const HumanMessage: React.FC<HumanMessageProps> = ({ message, messageNumber }) => {
    const content = extractContent(message.content);

    return (
        <div className="flex gap-3 animate-slide-in">
            {/* 用户头像 */}
            <div className="shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center mt-0.5">
                <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                </svg>
            </div>

            <div className="flex-1 min-w-0">
                {/* 标题行 */}
                <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-xs font-medium text-text-primary">You</span>
                    <span className="text-[10px] text-text-muted font-mono">#{messageNumber}</span>
                </div>

                {/* 消息内容 */}
                <div className="bg-bg-secondary border border-border-subtle px-4 py-3 rounded-lg rounded-tl-sm text-sm text-text-primary leading-relaxed whitespace-pre-wrap break-words">
                    {content}
                </div>
            </div>
        </div>
    );
};

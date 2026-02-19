/**
 * AI Message Component
 * 显示AI回复消息（包含thinking和Markdown内容）- 深色主题
 *
 * 优化点：
 * - 改进类型安全，移除 @ts-ignore
 * - 简化内容类型处理逻辑
 * - 提取内联样式到外部（规则：rendering-hoist-jsx）
 */

import React, { useState, useMemo } from 'react';
import type { RenderMessage } from '@langgraph-js/sdk';
import { getThinkingContent, getTextContent } from '@langgraph-js/sdk';

interface AIMessageProps {
    message: RenderMessage;
    messageNumber: number;
    modelName?: string;
}

// 内联样式提取到组件外部（规则：rendering-hoist-jsx）
const proseStyles = `
    .prose-invert h1, .prose-invert h2, .prose-invert h3 {
        color: #e5e7eb;
    }
    .prose-invert code {
        color: #a5f3fc;
        background: #1f2937;
        padding: 0.125rem 0.25rem;
        border-radius: 0.25rem;
    }
    .prose-invert pre {
        background: #111827;
        border: 1px solid #374151;
    }
    .prose-invert pre code {
        background: transparent;
        padding: 0;
    }
`;

// 提取文本内容的辅助函数（规则：js-early-exit）
function extractTextContent(textContent: unknown): string {
    if (!textContent) return '';

    // 字符串类型
    if (typeof textContent === 'string') {
        return textContent;
    }

    // 数组类型（LangGraph SDK 格式）
    if (Array.isArray(textContent)) {
        return textContent
            .filter((item) => item?.type === 'text')
            .map((item) => item?.text || '')
            .join('');
    }

    // 对象类型（带 error 或 message 字段）
    if (typeof textContent === 'object' && textContent !== null) {
        const obj = textContent as Record<string, unknown>;

        if ('error' in obj) {
            return String(obj.error || JSON.stringify(obj));
        }

        if ('message' in obj) {
            return String(obj.message || JSON.stringify(obj));
        }

        // 其他对象，转为 JSON 字符串
        try {
            return JSON.stringify(obj);
        } catch {
            return '[Object]';
        }
    }

    // 其他类型，转为字符串
    return String(textContent);
}

export const AIMessage: React.FC<AIMessageProps> = ({ message, messageNumber, modelName = 'AI' }) => {
    const [showThinking, setShowThinking] = useState(false);

    // 提取thinking内容
    const thinkingContent = getThinkingContent(message);

    // 提取并处理文本内容（使用 useMemo 优化）
    const displayContent = useMemo(() => {
        const textContent = getTextContent(message);
        return extractTextContent(textContent) || '<Thinking...>';
    }, [message]);

    // Thinking 区域的行数统计
    const thinkingLines = thinkingContent ? thinkingContent.split('\n').length : 0;

    return (
        <div className="flex flex-col">
            <div className="font-bold text-teal-400 mb-1">
                {messageNumber}. {modelName}
            </div>

            {/* Thinking区域 */}
            {thinkingContent ? (
                <details
                    className="mb-2 cursor-pointer"
                    open={showThinking}
                    onToggle={(e) => setShowThinking((e.target as HTMLDetailsElement).open)}
                >
                    <summary className="text-gray-400 hover:text-gray-200 select-none mb-1">
                        💭 Thinking ({thinkingLines} rows)
                    </summary>
                    <pre className="bg-gray-950 text-green-400 p-3 rounded text-sm overflow-x-auto whitespace-pre-wrap">
                        {thinkingContent}
                    </pre>
                </details>
            ) : null}

            {/* 消息内容 */}
            <div className="bg-gray-750 p-3 rounded text-gray-100 prose prose-invert prose-sm max-w-none">
                <style>{proseStyles}</style>
                {displayContent}
            </div>
        </div>
    );
};

/**
 * AI Message Component
 * 显示AI回复消息（包含thinking和Markdown内容）- 赛博朋克风格
 *
 * 优化点：
 * - 改进类型安全，移除 @ts-ignore
 * - 简化内容类型处理逻辑
 * - 提取内联样式到外部（规则：rendering-hoist-jsx）
 * - 集成 Streamdown 实现 Markdown/Code/Math/Mermaid 渲染
 */

import React, { useState, useMemo } from 'react';
import type { RenderMessage } from '@langgraph-js/sdk';
import { getThinkingContent, getTextContent } from '@langgraph-js/sdk';
import { Streamdown } from 'streamdown';
import { code } from '@streamdown/code';
// import { mermaid } from '@streamdown/mermaid';
import { cjk } from '@streamdown/cjk';
import 'streamdown/styles.css';

interface AIMessageProps {
    message: RenderMessage;
    messageNumber: number;
    modelName?: string;
}

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
        <div className="flex gap-3 animate-slide-in">
            {/* AI 头像 */}
            <div className="shrink-0 w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center mt-0.5">
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
                    <rect x="3" y="11" width="18" height="10" rx="2" />
                    <circle cx="12" cy="5" r="2" />
                    <path d="M12 7v4" />
                    <line x1="8" y1="16" x2="8" y2="16" strokeWidth="3" strokeLinecap="round" />
                    <line x1="12" y1="16" x2="12" y2="16" strokeWidth="3" strokeLinecap="round" />
                    <line x1="16" y1="16" x2="16" y2="16" strokeWidth="3" strokeLinecap="round" />
                </svg>
            </div>

            <div className="flex-1 min-w-0">
                {/* 标题行 */}
                <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-xs font-medium text-text-primary">{modelName}</span>
                    <span className="text-[10px] text-text-muted font-mono">#{messageNumber}</span>
                </div>

                {/* Thinking 区域 */}
                {thinkingContent ? (
                    <details
                        className="mb-2 cursor-pointer"
                        open={showThinking}
                        onToggle={(e) => setShowThinking((e.target as HTMLDetailsElement).open)}
                    >
                        <summary className="text-xs text-text-muted hover:text-text-secondary select-none flex items-center gap-1.5 transition-colors focus-visible:outline-none list-none">
                            <svg
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className={`transition-transform duration-150 ${showThinking ? 'rotate-90' : ''}`}
                                aria-hidden="true"
                            >
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                            <span>Thinking</span>
                            <span className="px-1 py-0.5 rounded text-[10px] bg-bg-tertiary border border-border-subtle font-mono">
                                {thinkingLines} lines
                            </span>
                        </summary>
                        <pre className="mt-2 bg-bg-tertiary border border-border-subtle px-3 py-2.5 rounded-md text-[11px] text-text-secondary overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
                            {thinkingContent}
                        </pre>
                    </details>
                ) : null}

                {/* 消息内容 */}
                <div className="bg-bg-secondary border border-border-subtle px-5 py-4 rounded-lg rounded-tl-sm text-text-primary max-w-none">
                    <Streamdown animated={true} plugins={{ code, cjk }}>
                        {displayContent}
                    </Streamdown>
                </div>
            </div>
        </div>
    );
};

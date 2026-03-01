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
import { mermaid } from '@streamdown/mermaid';
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
        <div className="flex flex-col animate-slide-in">
            <div className="text-xs text-text-muted mb-2">
                Message #{messageNumber} · {modelName}
            </div>

            {/* Thinking区域 */}
            {thinkingContent ? (
                <details
                    className="mb-3 cursor-pointer group"
                    open={showThinking}
                    onToggle={(e) => setShowThinking((e.target as HTMLDetailsElement).open)}
                >
                    <summary className="text-sm text-text-secondary hover:text-text-primary select-none mb-2 flex items-center gap-2 transition-colors duration-150">
                        <span>Thinking</span>
                        <span className="badge badge-primary">{thinkingLines} lines</span>
                    </summary>
                    <pre className="bg-bg-tertiary border border-border-subtle p-4 rounded-lg text-sm text-text-secondary overflow-x-auto whitespace-pre-wrap font-mono">
                        {thinkingContent}
                    </pre>
                </details>
            ) : null}

            {/* 消息内容 */}
            <div className="bg-bg-secondary border border-border-subtle p-6 rounded-lg text-text-primary max-w-none">
                <Streamdown animated={true} plugins={{ code, mermaid, cjk }}>
                    {displayContent}
                </Streamdown>
            </div>
        </div>
    );
};

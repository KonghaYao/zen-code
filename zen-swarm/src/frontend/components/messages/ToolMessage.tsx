/**
 * Tool Message Component
 * 显示工具调用消息（折叠式设计）
 * 参考 zen-code 的 MessageTool 实现：颜色编码、参数预览、输出截断
 */

import React, { useState, useMemo } from 'react';
import { ChevronDown } from '../ui/Icons.js';
import type { RenderMessage } from '@langgraph-js/sdk';
import { ToolRenderData, getMessageContent } from '@langgraph-js/sdk';
import { useChat } from '@langgraph-js/sdk/react';

interface ToolMessageProps {
    message: RenderMessage;
    messageNumber: number;
}

// 工具名颜色映射（基于哈希，参考 zen-code 实现）
const TOOL_COLOR_CLASSES = [
    { badge: 'bg-amber-50 text-amber-700 border-amber-200' },
    { badge: 'bg-violet-50 text-violet-700 border-violet-200' },
    { badge: 'bg-sky-50 text-sky-700 border-sky-200' },
    { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { badge: 'bg-rose-50 text-rose-700 border-rose-200' },
];

function getToolColorIndex(toolName: string): number {
    let hash = 0;
    for (let i = 0; i < toolName.length; i++) {
        hash = toolName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % TOOL_COLOR_CLASSES.length);
}

// 内容截断
function truncateContent(content: string, maxLines = 4, maxLineLen = 120): string {
    const lines = content.split('\n');
    const truncateLine = (line: string) =>
        line.length <= maxLineLen ? line : line.substring(0, maxLineLen) + `… (+${line.length - maxLineLen})`;

    if (lines.length <= maxLines) {
        return lines.map(truncateLine).join('\n');
    }
    const head = lines.slice(0, 2).map(truncateLine);
    const tail = lines.slice(-2).map(truncateLine);
    return [...head, `  … ${lines.length - 4} more lines …`, ...tail].join('\n');
}

// JSON 参数高亮渲染（参考 zen-code InputPreviewer，使用 HTML/Tailwind）
function JsonHighlight({ data, depth = 0 }: { data: unknown; depth?: number }) {
    if (depth >= 3) {
        return <span className="text-neutral-400 italic">{'{…}'}</span>;
    }

    if (data === null) {
        return <span className="text-neutral-400">null</span>;
    }

    if (typeof data === 'string') {
        const str = JSON.stringify(data);
        if (str.length > 120) {
            return (
                <span>
                    <span className="text-sky-600">"{data.substring(0, 100)}…"</span>
                    <span className="text-neutral-400 text-[10px]"> (+{data.length - 100} chars)</span>
                </span>
            );
        }
        return <span className="text-sky-600">{str}</span>;
    }

    if (typeof data === 'number') {
        return <span className="text-amber-600">{data}</span>;
    }

    if (typeof data === 'boolean') {
        return <span className="text-violet-600">{data.toString()}</span>;
    }

    if (Array.isArray(data)) {
        if (data.length === 0) return <span className="text-neutral-400">[]</span>;
        const shown = data.slice(0, 4);
        return (
            <span>
                {'[\n'}
                {shown.map((item, i) => (
                    <span key={i}>
                        {'  '.repeat(depth + 1)}
                        <span className="text-emerald-600">- </span>
                        <JsonHighlight data={item} depth={depth + 1} />
                        {i < shown.length - 1 ? ',\n' : '\n'}
                    </span>
                ))}
                {data.length > 4 && (
                    <span className="text-neutral-400 italic text-[10px]">
                        {'  '.repeat(depth + 1)}… ({data.length - 4} more){'\n'}
                    </span>
                )}
                {'  '.repeat(depth)}
                {']'}
            </span>
        );
    }

    if (typeof data === 'object' && data !== null) {
        const entries = Object.entries(data as Record<string, unknown>);
        if (entries.length === 0) return <span className="text-neutral-400">{'{}'}</span>;
        const shown = entries.slice(0, 5);
        return (
            <span>
                {'\n'}
                {shown.map(([key, val], i) => (
                    <span key={key}>
                        {'  '.repeat(depth + 1)}
                        <span className="text-neutral-600 font-medium">{key}</span>
                        <span className="text-neutral-400">: </span>
                        <JsonHighlight data={val} depth={depth + 1} />
                        {i < shown.length - 1 ? '\n' : ''}
                    </span>
                ))}
                {entries.length > 5 && (
                    <span className="text-neutral-400 italic text-[10px]">
                        {'\n'}
                        {'  '.repeat(depth + 1)}… ({entries.length - 5} more keys)
                    </span>
                )}
            </span>
        );
    }

    return <span>{String(data)}</span>;
}

export const ToolMessage: React.FC<ToolMessageProps> = ({ message, messageNumber }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { client } = useChat();

    /** @ts-ignore */
    const toolName: string = message.name || 'Unknown Tool';
    /** @ts-ignore */
    const status: string = message.status || (message.done !== false ? 'success' : 'running');
    /** @ts-ignore */
    const subMessages: unknown[] = message.sub_messages || [];

    const colorIndex = getToolColorIndex(toolName);
    const colors = TOOL_COLOR_CLASSES[colorIndex];

    // 状态配置
    const isError = status === 'error' || status === 'failed';
    const isRunning = status === 'running' || status === 'in_progress' || status === 'pending';
    const statusConfig = isError
        ? { dot: 'bg-red-500', label: 'Error', text: 'text-red-500' }
        : isRunning
          ? { dot: 'bg-amber-400 animate-pulse', label: 'Running', text: 'text-amber-500' }
          : { dot: 'bg-emerald-500', label: 'Done', text: 'text-emerald-600' };

    // 用 ToolRenderData 解析入参
    const toolData = useMemo(() => {
        if (!client) return null;
        try {
            return new ToolRenderData<Record<string, unknown>, unknown>(message, client);
        } catch {
            return null;
        }
    }, [message, client]);

    const inputData = useMemo(() => {
        if (!toolData) return null;
        try {
            return toolData.getInputRepaired();
        } catch {
            return null;
        }
    }, [toolData]);

    // 输出内容（截断）
    const outputText = useMemo(() => {
        try {
            const raw = getMessageContent(message.content);
            return truncateContent(raw || '');
        } catch {
            return '';
        }
    }, [message.content]);

    // 标题提示（从输入中提取 title/description）
    const inputHint = useMemo(() => {
        if (!inputData || typeof inputData !== 'object') return '';
        const d = inputData as Record<string, unknown>;
        return (
            (typeof d.title === 'string' ? d.title : '') ||
            (typeof d.description === 'string' ? d.description.slice(0, 60) : '') ||
            (typeof d.command === 'string' ? d.command.slice(0, 60) : '') ||
            (typeof d.path === 'string' ? d.path.slice(0, 60) : '')
        );
    }, [inputData]);

    return (
        <div className="py-0.5 mb-0.5">
            {/* 工具栏 Bar */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                aria-expanded={isExpanded}
                className="w-full flex items-center gap-2 text-left group focus-visible:outline-none"
            >
                {/* 状态点 */}
                <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />

                {/* 工具名 badge */}
                <span
                    className={`shrink-0 text-[11px] font-mono font-medium px-1.5 py-0.5 rounded border ${isError ? 'bg-red-50 text-red-700 border-red-200' : colors.badge}`}
                >
                    {toolName}
                </span>

                {/* 输入提示（title/command/path） */}
                {inputHint && (
                    <span className="text-[11px] text-neutral-400 font-mono truncate flex-1 min-w-0">{inputHint}</span>
                )}

                <div className="flex-1" />

                {/* sub_messages 计数 */}
                {subMessages.length > 0 && (
                    <span className="text-[10px] text-neutral-400 shrink-0">{subMessages.length} sub</span>
                )}

                {/* 消息编号 */}
                <span className="text-[10px] text-neutral-300 font-mono shrink-0">#{messageNumber}</span>

                {/* 展开/收起箭头 */}
                <ChevronDown
                    className={`w-3 h-3 text-neutral-300 transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                />
            </button>

            {/* 展开内容 */}
            {isExpanded && (
                <div className="mt-2 space-y-2">
                    {/* 输入参数 */}
                    {inputData && Object.keys(inputData).length > 0 && (
                        <div className="bg-neutral-50 border border-neutral-200 rounded px-3 py-2">
                            <div className="text-[10px] text-neutral-400 mb-1 font-medium uppercase tracking-wide">
                                Input
                            </div>
                            <pre className="text-[11px] font-mono whitespace-pre-wrap overflow-x-auto text-neutral-800 leading-relaxed">
                                <JsonHighlight data={inputData} />
                            </pre>
                        </div>
                    )}

                    {/* 输出内容 */}
                    {outputText && (
                        <div className="bg-neutral-50 border border-neutral-200 rounded px-3 py-2">
                            <div className="text-[10px] text-neutral-400 mb-1 font-medium uppercase tracking-wide">
                                Output
                                {isError && <span className="ml-1 text-red-500">· Error</span>}
                            </div>
                            <pre
                                className={`text-[11px] font-mono whitespace-pre-wrap overflow-x-auto leading-relaxed ${isError ? 'text-red-700' : 'text-neutral-600'}`}
                            >
                                {outputText}
                            </pre>
                        </div>
                    )}

                    {/* sub_messages 提示 */}
                    {subMessages.length > 0 && (
                        <div className="text-[10px] text-neutral-400 italic">
                            {subMessages.length} subagent message{subMessages.length > 1 ? 's' : ''} hidden
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

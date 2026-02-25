import { Box, Static } from 'ink';
import { useState, memo } from 'react';
import { useTimeout } from 'usehooks-ts';
import MessageHuman from './MessageHuman';
import MessageAI from './MessageAI';
import MessageTool from './MessageTool';
import { RenderMessage } from '@langgraph-js/sdk';
import { getColor } from '@codegraph/union-client';

interface MessagesBoxProps {
    renderMessages: RenderMessage[];
    startIndex: number;
    staticKey: string;
    loading: boolean;
}

/**
 * MessagesBox - Standard message display component
 *
 * Fully props-driven for better memoization:
 * - No internal useChat() calls
 * - Relies on staticKey from parent for Static component
 */
export const MessagesBox = memo(function MessagesBox({
    renderMessages,
    startIndex,
    staticKey,
    loading,
}: MessagesBoxProps) {
    // 修复 Static 首次渲染问题：强制重新渲染
    const [ready, setReady] = useState(false);

    // 使用 useTimeout 替代原生 setTimeout
    useTimeout(() => setReady(true), ready ? null : 0);

    const renderMessage = (message: RenderMessage, index: number, isCurrent: boolean, prefix: string) => (
        <Box
            key={message.id ? `${prefix}-${message.id}` : `${prefix}-msg-${index}`}
            flexDirection="column"
            paddingLeft={1}
            paddingBottom={1}
        >
            {message.type === 'human' ? (
                <MessageHuman content={message.content} messageNumber={index + 1 + startIndex} />
            ) : message.type === 'tool' ? (
                <MessageTool message={message} messageNumber={index + 1 + startIndex} />
            ) : (
                <MessageAI message={message} messageNumber={index + 1 + startIndex} loading={loading} />
            )}
        </Box>
    );

    let index = renderMessages.findIndex((cur) => {
        if (cur.type === 'tool' && !cur.done && !['success', 'error'].includes(cur.status!)) {
            return true;
        }
        return false;
    });

    // 没有未完成的 tool，最后一个消息作为 current
    if (index === -1) {
        index = renderMessages.length - 1;
    }

    const histories = renderMessages.slice(0, index);
    const current = renderMessages.slice(index);

    // 首次渲染时直接显示，后续使用 Static
    if (!ready) {
        return (
            <Box flexDirection="column">
                {renderMessages.map((message, i) => renderMessage(message, i, i === index, 'init'))}
            </Box>
        );
    }

    return (
        <Box flexDirection="column">
            {/* 历史消息：用 Static 固定，使用 granular key 清除旧内容 */}
            <Static items={histories} key={staticKey}>
                {(message, i) => renderMessage(message, i, false, 'hist')}
            </Static>

            {/* 当前消息 */}
            {current.map((message, i) => renderMessage(message, histories.length + i, true, 'curr'))}
        </Box>
    );
});

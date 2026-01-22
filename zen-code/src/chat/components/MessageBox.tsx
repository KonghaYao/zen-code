import { Box, Static } from 'ink';
import { useState, useEffect } from 'react';
import MessageHuman from './MessageHuman';
import MessageAI from './MessageAI';
import MessageTool from './MessageTool';
import { RenderMessage } from '@langgraph-js/sdk';
import { getColor } from '@codegraph/union-client';
import { useChat } from '@langgraph-js/sdk/react';

export const MessagesBox = ({
    renderMessages,
    startIndex,
}: {
    renderMessages: RenderMessage[];
    startIndex: number;
}) => {
    const { currentChatId } = useChat()
    // 修复 Static 首次渲染问题：强制重新渲染
    const [ready, setReady] = useState(false);

    useEffect(() => {
        // 延迟一帧确保 Static 已挂载
        const timer = setTimeout(() => setReady(true), 0);
        return () => clearTimeout(timer);
    }, []);

    const renderMessage = (message: RenderMessage, index: number, isCurrent: boolean) => (
        <Box
            key={message.id || index}
            flexDirection="column"
            borderStyle={isCurrent ? 'double' : "single"}
            borderLeft
            paddingLeft={1}
            paddingBottom={1}
            borderBottom={false}
            borderTop={false}
            borderRight={false}
            borderLeftColor={
                message.type === 'ai'
                    ? getColor('teal')
                    : message.type === 'human'
                        ? getColor('amber')
                        : 'yellow'
            }
        >
            {message.type === 'human' ? (
                <MessageHuman content={message.content} messageNumber={index + 1 + startIndex} />
            ) : message.type === 'tool' ? (
                <MessageTool message={message} messageNumber={index + 1 + startIndex} />
            ) : (
                <MessageAI message={message} messageNumber={index + 1 + startIndex} />
            )}
        </Box>
    );

    let index = renderMessages.findIndex((cur) => {
        if (cur.type === 'tool' && (!cur.done && (!['success', 'error'].includes(cur.status!)))) {
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
                {renderMessages.map((message, i) => renderMessage(message, i, i === index))}
            </Box>
        );
    }

    return (
        <Box flexDirection="column">
            {/* 历史消息：用 Static 固定，使用 key 强制重新挂载 */}
            <Static
                items={histories}
                key={currentChatId} // MODIFIED: 切换聊天时强制重新挂载，清除旧内容
            >
                {(message, i) => renderMessage(message, i, false)}
            </Static>

            {/* 当前消息 */}
            {current.map((message, i) => renderMessage(message, histories.length + i, true))}
        </Box>
    );
};

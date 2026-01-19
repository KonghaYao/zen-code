import { Box, Static } from 'ink';
import { useState, useEffect } from 'react';
import MessageHuman from './MessageHuman';
import MessageAI from './MessageAI';
import MessageTool from './MessageTool';
import { RenderMessage } from '@langgraph-js/sdk';
import { getColor } from '../../utils/colors';

export const MessagesBox = ({
    renderMessages,
    startIndex,
}: {
    renderMessages: RenderMessage[];
    startIndex: number;
}) => {
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
        if (cur.type === 'tool' && !cur.done) {
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
            <Box flexDirection="column" paddingY={1}>
                {renderMessages.map((message, i) => renderMessage(message, i, i === index))}
            </Box>
        );
    }

    return (
        <Box flexDirection="column" paddingY={1}>
            {/* 历史消息：用 Static 固定 */}
            <Static items={histories}>
                {(message, i) => renderMessage(message, i, false)}
            </Static>

            {/* 当前消息 */}
            {current.map((message, i) => renderMessage(message, histories.length + i, true))}
        </Box>
    );
};

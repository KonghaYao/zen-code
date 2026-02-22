import React, { useState, useMemo } from 'react';
import { Box, Text } from 'ink';
import { RenderMessage } from '@langgraph-js/sdk';
import { getThinkingContent, getTextContent } from '@langgraph-js/sdk';
import Markdown from '../common/Markdown';
import { getColor } from '@codegraph/union-client';
import { LimitedOutput } from 'ink-pro';

interface MessageAIProps {
    message: RenderMessage;
    messageNumber: number;
    loading: boolean;
}

const MessageAI: React.FC<MessageAIProps> = ({ message, messageNumber, loading }) => {
    const modelName = 'AI';

    // MODIFIED: 提取 thinking 内容
    const thinkingContent = getThinkingContent(message);
    /** @ts-ignore */
    const rawTextContents = getTextContent(message);
    if (!rawTextContents) return <></>;
    return (
        <Box flexDirection="column">
            <Box paddingBottom={0} marginBottom={1}>
                <Text color={getColor('teal')}>
                    {messageNumber} {modelName}
                </Text>
            </Box>
            {/* 渲染 thinking 内容 */}
            {thinkingContent && (
                <Reasoning thinking={thinkingContent} visible={rawTextContents.trim().length === 0}></Reasoning>
            )}
            {/* <Text>{rawTextContents}</Text> */}
            <Markdown simple={false} loading={loading}>
                {rawTextContents}
            </Markdown>
        </Box>
    );
};

interface ReasoningProps {
    thinking: string;
    visible: boolean;
}

const Reasoning: React.FC<ReasoningProps> = ({ thinking, visible }) => {
    const lines = thinking.split('\n');

    return (
        <Box flexDirection="column" marginBottom={1}>
            <Box paddingBottom={0}>
                <Text color="gray" bold>
                    Think {lines.length} rows
                </Text>
            </Box>
            {visible && <LimitedOutput content={thinking} maxLines={3}></LimitedOutput>}
        </Box>
    );
};

export default MessageAI;

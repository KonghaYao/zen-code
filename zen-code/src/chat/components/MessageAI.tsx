import React, { useState, useMemo } from 'react';
import { Box, Text } from 'ink';
import { RenderMessage } from '@langgraph-js/sdk';
import { getThinkingContent, getTextContent } from '@langgraph-js/sdk';
import { useSettings } from '../context/SettingsContext';
import Markdown from './Markdown';
import { getColor } from '@codegraph/union-client';

interface MessageAIProps {
    message: RenderMessage;
    messageNumber: number;
}

const MessageAI: React.FC<MessageAIProps> = ({ message, messageNumber }) => {
    const { extraParams } = useSettings();
    const modelName = extraParams.main_model || 'AI';

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
                <Reasoning
                    thinking={thinkingContent}
                    hasContent={rawTextContents.trim().length > 0}
                ></Reasoning>
            )}
            {/* <Text>{JSON.stringify(message.content)}</Text> */}
            <Markdown>{rawTextContents}</Markdown>
        </Box>
    );
};

interface ReasoningProps {
    thinking: string;
    hasContent: boolean;
}

const Reasoning: React.FC<ReasoningProps> = ({ thinking, hasContent }) => {

    const lines = thinking.split('\n');
    // 无正文：显示最后 3 行
    const displayLines = lines.slice(-1);

    return (
        <Box flexDirection="column" marginBottom={1}>
            <Box paddingBottom={0}>
                <Text color="gray" bold>
                    Think {lines.length} rows
                </Text>
            </Box>
            <Box paddingLeft={2} flexDirection="column">
                {displayLines.map((line, i) => (
                    <Text key={i} dimColor>
                        {line}
                    </Text>
                ))}
            </Box>
        </Box>
    );
};

export default MessageAI;

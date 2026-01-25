import React from 'react';
import { Box, Text } from 'ink';
import { RenderMessage } from '@langgraph-js/sdk';
import { getTextContent } from '@langgraph-js/sdk';
import { getCurrentUser, getColor } from '@codegraph/union-client';

interface CompactMessageProps {
    message: RenderMessage;
    messageNumber: number;
}

export const CompactMessage: React.FC<CompactMessageProps> = ({ message, messageNumber }) => {
    const username = getCurrentUser();

    if (message.type === 'human') {
        const content = typeof message.content === 'string'
            ? message.content
            : Array.isArray(message.content)
                ? message.content.filter(item => item.type === 'text').map(item => item.text).join('')
                : '';

        const preview = content.length > 60 ? content.slice(0, 60) + '...' : content;

        return (
            <Box>
                <Text color={getColor('amber')}>
                    {messageNumber} {username}: {preview}
                </Text>
            </Box>
        );
    }

    if (message.type === 'ai') {
        let content = '';
        try {
            content = getTextContent(message) || '';
        } catch {
            content = '';
        }

        const preview = content.length > 60 ? content.slice(0, 60) + '...' : content;

        return (
            <Box>
                <Text color={getColor('teal')}>
                    {messageNumber} AI: {preview || '(thinking...)'}
                </Text>
            </Box>
        );
    }

    return null;
};

export default CompactMessage;

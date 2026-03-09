import React from 'react';
import { Box, Text } from 'ink';
import { getCurrentUser, getColor } from '@codegraph/union-client';

interface MessageHumanProps {
    content: string | any[];
    messageNumber: number;
}

const MessageHuman: React.FC<MessageHumanProps> = ({ content, messageNumber }) => {
    const username = getCurrentUser();

    const renderContent = () => {
        if (typeof content === 'string') {
            return <Text color="white">{content}</Text>;
        }

        if (Array.isArray(content)) {
            return content.map((item, index) => {
                if (item.type === 'text') {
                    return (
                        <Text key={index} color="white">
                            {item.text}
                        </Text>
                    );
                }
                if (item.type === 'image') {
                    return (
                        <Text key={index} color="cyan">
                            📎 [image/{item.mime_type?.split('/')[1] ?? 'png'}]
                        </Text>
                    );
                }
                return null;
            });
        }
        // Fallback for unexpected content types
        return <Text color="white">{JSON.stringify(content)}</Text>;
    };

    return (
        <Box flexDirection="column">
            <Box>
                <Text color={getColor('amber')}>
                    {messageNumber} {username}
                </Text>
            </Box>
            <Box>
                <Text color="gray">└─ {renderContent()}</Text>
            </Box>
        </Box>
    );
};

export default MessageHuman;

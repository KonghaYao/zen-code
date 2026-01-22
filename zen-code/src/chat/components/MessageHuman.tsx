import React from 'react';
import { Box, Text } from 'ink';
import { getCurrentUser } from '../../utils/user';
import { getColor } from '../../utils/colors';

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
            return content
                .filter((item) => item.type === 'text')
                .map((item, index) => <Text color="white">{item.text}</Text>);
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

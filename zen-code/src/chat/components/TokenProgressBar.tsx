import React from 'react';
import { Box, Text } from 'ink';
import { calculateTokenUsage, formatTokenCount } from '../../utils/tokenUsage';

interface TokenProgressBarProps {
    currentTokens: number;
}

const TokenProgressBar: React.FC<TokenProgressBarProps> = ({ currentTokens }) => {
    const usage = calculateTokenUsage(currentTokens);
    const width = 5; // Width of the progress bar in characters
    const filledWidth = Math.round((usage.percentage / 100) * width);
    const emptyWidth = width - filledWidth;

    const filledBar = '█'.repeat(filledWidth);
    const emptyBar = '░'.repeat(emptyWidth);

    return (
        <Box flexDirection="row" alignItems="center" gap={1}>
            <Text color="gray">
                {filledBar}
                {emptyBar}
            </Text>
            <Text color="gray" dimColor>
                {usage.percentage.toFixed(1)}% ({formatTokenCount(usage.current)}/{formatTokenCount(usage.max)})
            </Text>
        </Box>
    );
};

export default TokenProgressBar;

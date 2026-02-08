import { Box, Text } from 'ink';

export interface LimitedOutputProps {
    content: string;
    maxLines?: number;
    borderColor?: string;
    borderStyle?: 'single' | 'double' | 'round' | 'bold' | 'boldDouble';
    marginTop?: number;
    paddingX?: number;
    showOmittedInfo?: boolean;
    width?: number; // Optional: width will be calculated from content if not provided
}

/**
 * 限制输出高度的组件，只显示最后 N 行内容
 */
export const LimitedOutput = ({
    content,
    maxLines = 10,
    borderColor = 'cyan',
    borderStyle = 'single',
    marginTop = 0,
    paddingX = 0,
    showOmittedInfo = true,
    width,
}: LimitedOutputProps) => {
    if (!content) return null;

    // Calculate width based on content if not provided
    const lines = content.split('\n');
    const calculatedWidth = width || (lines.length > 0 ? Math.max(...lines.map((line) => line.length)) + 10 : 80);
    const truncatedLines = lines.map((i) => i.slice(0, calculatedWidth - 10));
    const omittedCount = Math.max(0, truncatedLines.length - maxLines);
    const lastLines = truncatedLines.slice(-maxLines).join('\n');

    return (
        <Box flexDirection="column" width={calculatedWidth}>
            <Box
                borderStyle={borderStyle as any}
                borderColor={borderColor}
                borderLeft={false}
                borderRight={false}
                flexDirection="column"
                paddingX={paddingX}
                marginTop={marginTop}
            >
                {showOmittedInfo && omittedCount > 0 && (
                    <Text color="gray" dimColor>
                        ... {omittedCount} lines omitted ...
                    </Text>
                )}
                <Text dimColor>{lastLines}</Text>
            </Box>
        </Box>
    );
};

import { Box, Text } from 'ink';
import { useWindowSize } from '@codegraph/union-client';

interface LimitedOutputProps {
    content: string;
    maxLines?: number;
    borderColor?: string;
    borderStyle?: 'single' | 'double' | 'round' | 'bold' | 'boldDouble';
    marginTop?: number;
    paddingX?: number;
    showOmittedInfo?: boolean;
}

/**
 * 限制输出高度的组件，只显示最后 N 行内容
 */
export const LimitedOutput = ({
    content,
    maxLines = 10,
    borderColor = 'cyan',
    borderStyle = 'single',
    marginTop = 1,
    paddingX = 0,
    showOmittedInfo = true,
}: LimitedOutputProps) => {
    if (!content) return null;

    const { width } = useWindowSize()
    const lines = content.split('\n').map(i => i.slice(0, width - 10));
    const omittedCount = Math.max(0, lines.length - maxLines);
    const lastLines = lines.slice(-maxLines).join('\n');
    return (
        <Box flexDirection="column" width={width - 5}>
            <Box
                borderStyle={borderStyle as any}
                borderColor={borderColor}
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

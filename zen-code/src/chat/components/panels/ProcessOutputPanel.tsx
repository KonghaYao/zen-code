import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useInput } from 'ink-pro';
import { processManager } from '../../services/ProcessManagerService.js';

interface ProcessOutputPanelProps {
    pid: number;
    onClose: () => void;
}

const ProcessOutputPanel: React.FC<ProcessOutputPanelProps> = ({ pid, onClose }) => {
    const [output, setOutput] = useState({ stdout: '', stderr: '' });

    // ESC 键退出
    useInput((input, key) => {
        if (key.escape) {
            onClose();
        }
    });

    // 实时更新输出
    useEffect(() => {
        const refresh = () => {
            const result = processManager.getProcessOutput(pid);
            if (result) setOutput(result);
        };

        refresh();
        const interval = setInterval(refresh, 500);
        return () => clearInterval(interval);
    }, [pid]);

    const truncatedStdout = truncateOutput(output.stdout, 20);
    const truncatedStderr = truncateOutput(output.stderr, 20);

    return (
        <Box flexDirection="column" padding={1}>
            <Box justifyContent="space-between" marginBottom={1}>
                <Text bold color="cyan">
                    进程 [{pid}] 输出
                </Text>
                <Text dimColor>按 ESC 返回</Text>
            </Box>

            <Box flexDirection="column" marginBottom={1}>
                <Text color="green" bold>
                    STDOUT:
                </Text>
                <Box borderStyle="single" borderColor="green" paddingX={1}>
                    <Text>{truncatedStdout || '(空)'}</Text>
                </Box>
            </Box>

            <Box flexDirection="column">
                <Text color="red" bold>
                    STDERR:
                </Text>
                <Box borderStyle="single" borderColor="red" paddingX={1}>
                    <Text>{truncatedStderr || '(空)'}</Text>
                </Box>
            </Box>
        </Box>
    );
};

function truncateOutput(output: string, maxLines: number): string {
    const lines = output.split('\n');
    if (lines.length <= maxLines) return output;

    // 取最后 maxLines 行
    const lastLines = lines.slice(-maxLines);
    return `...${lastLines.join('\n')}`;
}

export default ProcessOutputPanel;

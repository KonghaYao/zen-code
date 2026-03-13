import React from 'react';
import { Box, Text } from 'ink';
import { useSettings } from '../../context/SettingsContext';
import pkg from '../../../../package.json';

// 禅兔吉祥物 — 方块像素风格，每行由 [文字, 颜色] 片段组成
type MascotSegment = [string, string];
const MASCOT: MascotSegment[][] = [
    [['  ▓▓  ▓▓  ', 'yellow']],
    [['  ▓▓▓▓▓▓▓▓  ', 'yellow']],
    [
        [' ▓▓ ', 'yellow'],
        ['>', 'cyan'],
        ['  ', 'yellow'],
        ['<', 'cyan'],
        [' ▓▓ ', 'yellow'],
    ],
    [[' ▓▓▓▓▓▓▓▓▓▓ ', 'yellow']],
    [
        ['▓▓▓▓▓', 'cyan'],
        ['▓▓', 'yellow'],
        ['▓▓▓▓▓', 'cyan'],
    ],
    [
        [' ▓▓▓▓', 'cyan'],
        ['▓▓', 'yellow'],
        ['▓▓▓▓ ', 'cyan'],
    ],
    [['  ▀▀▀▀▀▀▀▀  ', 'gray']],
];

const SHORTCUTS: [string, string][] = [
    ['/model', '模型'],
    ['/mcp', 'MCP'],
    ['/agent', 'Agent'],
    ['/new', '新对话'],
    ['/plan', '规划'],
    ['/settings', '设置'],
    ['/help', '帮助'],
];

// 信息行组件：label + value 对齐展示
const InfoRow: React.FC<{ label: string; value: string; valueColor?: string }> = ({
    label,
    value,
    valueColor = 'white',
}) => (
    <Box gap={1}>
        <Text color="blue" dimColor>
            {label.padEnd(10)}
        </Text>
        <Text color={valueColor as any}>{value}</Text>
    </Box>
);

const WelcomeHeader: React.FC = () => {
    const { AVAILABLE_MODELS, config, extraParams } = useSettings();

    const provider = config?.provider_id || process.env.MODEL_PROVIDER || 'openai';
    const currentProvider = config?.providers?.find((p: any) => p.id === provider);
    const hasProviderKey = !!currentProvider?.apiKey;
    const hasModels = AVAILABLE_MODELS.length > 0;
    const isConfigured = hasProviderKey;

    const modelId = extraParams?.model_id || config?.model_id || '—';
    const agentName = extraParams?.switch_command || 'default';
    const cwd = process.cwd();

    // 快捷键分 4 列两行
    const col = 4;
    const row1 = SHORTCUTS.slice(0, col);
    const row2 = SHORTCUTS.slice(col);

    return (
        <Box flexDirection="column" paddingX={1} marginBottom={1}>
            {/* 标题栏 */}
            <Box justifyContent="space-between" marginBottom={1}>
                <Box gap={2}>
                    <Text color="cyan" bold>
                        ZEN CODE
                    </Text>
                    <Text dimColor>v{pkg.version}</Text>
                </Box>
                <Text color={isConfigured ? 'green' : 'red'} bold>
                    {isConfigured ? '● ONLINE' : '● OFFLINE'}
                </Text>
            </Box>

            {/* 主内容：吉祥物 + 系统信息 */}
            <Box flexDirection="row" gap={3}>
                {/* 左侧：吉祥物 */}
                <Box flexDirection="column" alignItems="center">
                    {MASCOT.map((segments, i) => (
                        <Box key={i}>
                            {segments.map(([text, color], j) => (
                                <Text key={j} color={color as any}>
                                    {text}
                                </Text>
                            ))}
                        </Box>
                    ))}
                </Box>

                {/* 右侧：状态信息 */}
                <Box flexDirection="column" justifyContent="center" gap={0}>
                    <InfoRow label="Provider" value={provider} valueColor="cyan" />
                    <InfoRow label="Model" value={modelId} valueColor="yellow" />
                    <InfoRow label="Agent" value={agentName} valueColor="magenta" />
                    <InfoRow label="CWD" value={cwd.length > 40 ? '…' + cwd.slice(-39) : cwd} valueColor="gray" />

                    {!hasProviderKey && (
                        <Box marginTop={1}>
                            <Text color="yellow">⚠ 运行 /model 配置 API Key</Text>
                        </Box>
                    )}
                    {hasProviderKey && !hasModels && (
                        <Box marginTop={1}>
                            <Text color="yellow">⚠ 运行 /model 检查模型列表</Text>
                        </Box>
                    )}
                </Box>
            </Box>

            {/* 快捷命令区 */}
            <Box
                flexDirection="column"
                gap={0}
                borderTop
                borderStyle="single"
                borderBottom
                borderLeft={false}
                borderRight={false}
            >
                <Box gap={4}>
                    {row1.map(([cmd, desc]) => (
                        <Box key={cmd} gap={1}>
                            <Text color="cyan">{cmd}</Text>
                            <Text dimColor>{desc}</Text>
                        </Box>
                    ))}
                </Box>
                <Box gap={4}>
                    {row2.map(([cmd, desc]) => (
                        <Box key={cmd} gap={1}>
                            <Text color="cyan">{cmd}</Text>
                            <Text dimColor>{desc}</Text>
                        </Box>
                    ))}
                </Box>
            </Box>
        </Box>
    );
};

export default WelcomeHeader;

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import Shimmer from '../../chat/components/Shimmer';

interface WelcomeStepProps {
    onNext: () => void;
    onExit: () => void;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onNext, onExit }) => {
    useInput((input, key) => {
        if (key.return) {
            onNext();
        } else if (key.ctrl && input === 'c') {
            onExit();
        }
    });

    // 全局动画索引，用于同步所有 Shimmer 组件
    const [globalShimmerIndex, setGlobalShimmerIndex] = useState(0);

    useEffect(() => {
        const interval = 40;
        const maxTextLength = 28; // 最长的一行字符数
        const spread = 32;
        const maxIndex = maxTextLength + spread * 2;

        const timer = setInterval(() => {
            setGlobalShimmerIndex((prev) => (prev + 1) % maxIndex);
        }, interval);

        return () => clearInterval(timer);
    }, []);

    return (
        <Box flexDirection="column" flexGrow={1} justifyContent="center" paddingX={2}>
            <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} marginBottom={1}>
                {/* Header */}
                <Box flexDirection="row" justifyContent="space-between" borderBottom={false}>
                    <Text color="cyan" bold>
                        设置向导
                    </Text>
                    <Text color="gray">[1/4]</Text>
                </Box>

                {/* Main Content */}
                <Box flexDirection="row" marginTop={1} gap={2}>
                    {/* Left: Logo */}
                    <Box flexDirection="column">
                        {`███████╗███████╗███╗   ██╗
╚══███╔╝██╔════╝████╗  ██║
  ███╔╝ █████╗  ██╔██╗ ██║
 ███╔╝  ██╔══╝  ██║╚██╗██║
███████╗███████╗██║ ╚████║
╚══════╝╚══════╝╚═╝  ╚═══╝`
                            .split('\n')
                            .map((line) => {
                                return <Shimmer key={line} interval={40} text={line} globalIndex={globalShimmerIndex} />;
                            })}
                    </Box>

                    {/* Right: Info Panel */}
                    <Box flexDirection="column" justifyContent="center" flexGrow={1}>
                        <Box marginBottom={1}>
                            <Text color="yellow" bold>
                                {' '}
                                ⚡ 初始化中
                            </Text>
                        </Box>

                        <Box flexDirection="column" gap={0}>
                            <Box>
                                <Text color="blue">产品 ::</Text>
                                <Text color="white">Zen Code</Text>
                            </Box>
                            <Box>
                                <Text color="blue">类型 ::</Text>
                                <Text color="white">AI 驱动的命令行助手</Text>
                            </Box>
                            <Box>
                                <Text color="blue">状态 ::</Text>
                                <Text color="green">准备配置</Text>
                            </Box>
                        </Box>

                        <Box marginTop={1} flexDirection="column" gap={0}>
                            <Text color="gray" bold>
                                设置步骤：
                            </Text>
                            <Text color="white">{'  '}● 选择提供商</Text>
                            <Text color="white">{'  '}● API 配置</Text>
                            <Text color="white">{'  '}● 选择模型</Text>
                            <Text color="white">{'  '}● 完成</Text>
                        </Box>
                    </Box>
                </Box>

                {/* Footer */}
                <Box marginTop={1} paddingTop={1} borderTop={false} flexDirection="row" justifyContent="space-between">
                    <Box gap={3}>
                        <Box>
                            <Text color="green">●</Text>
                            <Text color="white" dimColor>
                                {' '}
                                AI 智能体
                            </Text>
                        </Box>
                        <Box>
                            <Text color="green">●</Text>
                            <Text color="white" dimColor>
                                {' '}
                                文件系统
                            </Text>
                        </Box>
                        <Box>
                            <Text color="green">●</Text>
                            <Text color="white" dimColor>
                                {' '}
                                记忆系统
                            </Text>
                        </Box>
                    </Box>

                    <Box>
                        <Text color="cyan" bold>{`>>> 按 [Enter] 开始`}</Text>
                        <Text color="cyan" dimColor>
                            {' '}
                            ▌
                        </Text>
                    </Box>
                </Box>
            </Box>

            {/* Exit Hint */}
            <Box flexDirection="row" justifyContent="center">
                <Text color="gray" dimColor>
                    [Ctrl+C 退出]
                </Text>
            </Box>
        </Box>
    );
};

import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text } from 'ink';
import { MultiLineTextInput } from 'ink-pro';
import { useChatInputBuffer } from '@codegraph/union-client';

export interface ChatInputBufferProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: (value: string) => void;
    loading: boolean;
    placeholder?: string;
    commandHandler: {
        isCommandInput: boolean;
        CommandHintUI: React.FC;
        commandSuggestions?: any[];
    };
}

export const ChatInputBuffer: React.FC<ChatInputBufferProps> = ({
    value,
    onChange,
    onSubmit,
    loading,
    placeholder = '输入消息...',
    commandHandler,
}) => {
    const { bufferedMessage, setBufferedMessage, clearBuffer } = useChatInputBuffer();
    const [internalValue, setInternalValue] = useState(value);

    // 同步外部 value 变化
    useEffect(() => {
        setInternalValue(value);
    }, [value]);

    // 计算是否为命令输入（基于 internalValue）
    const isCommandInput = useMemo(() => internalValue.startsWith('/'), [internalValue]);

    // 处理输入变化，同步到外部和命令检测
    const handleChange = (newValue: string) => {
        setInternalValue(newValue);
        onChange(newValue); // 同步到外部 userInput，让 CommandHandler 能检测到
    };

    const handleSubmit = (internalValue: string) => {
        if (!internalValue.trim()) return;

        // 命令优先处理
        if (isCommandInput) {
            onSubmit(internalValue);
            setInternalValue('');
            ('');
            return;
        }

        if (loading) {
            // AI 响应中：加入缓冲区
            setBufferedMessage(internalValue);
            setInternalValue(''); // 清空输入框
        } else {
            // AI 空闲：直接发送
            onSubmit(internalValue);
            setInternalValue('');
        }
    };

    // 处理 Esc 键清空缓冲区
    const handleEsc = () => {
        if (bufferedMessage) {
            clearBuffer(); // 清空缓冲区
        } else {
            setInternalValue(''); // 清空输入框
        }
    };

    // 处理命令补全 - 右箭头键（仅在光标在末尾且是命令输入时触发）
    const handleRightArrow = () => {
        if (!isCommandInput || !commandHandler.commandSuggestions || commandHandler.commandSuggestions.length === 0) {
            return false; // 不是命令输入或没有建议，不拦截
        }

        const suggestions = commandHandler.commandSuggestions;
        // 检查光标是否在末尾（通过检查当前 internalValue 和用户输入的最后一个字符位置）
        // ink-pro 的 MultiLineTextInput 不直接提供光标位置信息
        // 我们假设用户在连续输入时，光标通常在末尾
        // 只有当输入以 '/' 开头且匹配某个建议的命令名前缀时才触发补全

        const firstSuggestion = suggestions[0];
        const completionText = firstSuggestion.displayText || firstSuggestion.command || '';

        // 执行补全：使用第一个建议
        const completedText = completionText + ' '; // 补全后添加空格
        handleChange(completedText);

        return true; // 拦截按键，阻止默认行为
    };

    return (
        <Box flexDirection="column">
            {/* 缓冲区提示条 */}
            {bufferedMessage && (
                <Box padding={1}>
                    <Text color="yellow">
                        📝 缓冲区: {bufferedMessage.slice(0, 50)}
                        {bufferedMessage.length > 50 ? '...' : ''}
                    </Text>
                </Box>
            )}

            {/* 外部命令提示（用于错误和成功消息） */}
            <commandHandler.CommandHintUI />

            {/* 输入框 */}
            <Box paddingY={1}>
                <MultiLineTextInput
                    id="global-input"
                    value={internalValue}
                    onChange={handleChange}
                    onSubmit={handleSubmit}
                    onHotKey={(input, key) => {
                        if (key.escape) {
                            handleEsc();
                            return false; // 阻止默认行为
                        }

                        // 处理右箭头键补全命令
                        if (key.rightArrow) {
                            const handled = handleRightArrow();
                            if (handled) {
                                return false; // 阻止默认行为
                            }
                        }

                        return true;
                    }}
                    placeholder={
                        loading
                            ? bufferedMessage
                                ? '按 Esc 清空缓冲区'
                                : 'AI 响应中，Enter 将消息加入缓冲区'
                            : isCommandInput
                              ? '输入命令... (试试 /help，按 → 补全第一个建议)'
                              : placeholder
                    }
                />
            </Box>
        </Box>
    );
};

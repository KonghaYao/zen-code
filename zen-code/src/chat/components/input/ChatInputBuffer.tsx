import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Text } from 'ink';
import { MultiLineTextInput } from 'ink-pro';
import { useChatInputBuffer } from '@codegraph/union-client';
import { useSkillAutocomplete } from '../../hooks/useSkillAutocomplete';
import { SkillAutocompleteHintUI } from './SkillAutocompleteUI';
import type { Skill } from '@codegraph/config';

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
    /** Available skills for autocomplete */
    skills?: Skill[];
}

export const ChatInputBuffer: React.FC<ChatInputBufferProps> = ({
    value,
    onChange,
    onSubmit,
    loading,
    placeholder = '输入消息...',
    commandHandler,
    skills = [],
}) => {
    const { bufferedMessage, setBufferedMessage, clearBuffer } = useChatInputBuffer();
    const [internalValue, setInternalValue] = useState(value);

    // Initialize skill autocomplete
    const skillAutocomplete = useSkillAutocomplete({
        skills,
        maxSuggestions: 5,
    });

    // 同步外部 value 变化
    useEffect(() => {
        setInternalValue(value);
    }, [value]);

    // 计算是否为命令输入（基于 internalValue）
    const isCommandInput = useMemo(() => internalValue.startsWith('/'), [internalValue]);

    // Check for skill autocomplete trigger when input changes
    useEffect(() => {
        if (!isCommandInput) {
            skillAutocomplete.checkTrigger(internalValue);
        }
    }, [internalValue, isCommandInput, skillAutocomplete.checkTrigger]);

    // 处理输入变化，同步到外部和命令检测
    const handleChange = useCallback(
        (newValue: string) => {
            setInternalValue(newValue);
            onChange(newValue); // 同步到外部 userInput，让 CommandHandler 能检测到
        },
        [onChange],
    );

    const handleSubmit = useCallback(
        (submitValue: string) => {
            if (!submitValue.trim()) return;

            // Hide skill autocomplete on submit
            skillAutocomplete.hide();

            // 命令优先处理
            if (isCommandInput) {
                onSubmit(submitValue);
                setInternalValue('');
                return;
            }

            if (loading) {
                // AI 响应中：加入缓冲区
                setBufferedMessage(submitValue);
                setInternalValue(''); // 清空输入框
            } else {
                // AI 空闲：直接发送
                onSubmit(submitValue);
                setInternalValue('');
            }
        },
        [isCommandInput, loading, onSubmit, setBufferedMessage, skillAutocomplete],
    );

    // 处理 Esc 键清空缓冲区或关闭技能补全
    const handleEsc = useCallback(() => {
        // If skill autocomplete is open, close it first
        if (skillAutocomplete.isActive) {
            skillAutocomplete.hide();
            return;
        }

        if (bufferedMessage) {
            clearBuffer(); // 清空缓冲区
        } else {
            setInternalValue(''); // 清空输入框
        }
    }, [bufferedMessage, clearBuffer, skillAutocomplete]);

    // 处理命令补全 - 右箭头键（仅在光标在末尾且是命令输入时触发）
    const handleCommandCompletion = useCallback(() => {
        if (!isCommandInput || !commandHandler.commandSuggestions || commandHandler.commandSuggestions.length === 0) {
            return false; // 不是命令输入或没有建议，不拦截
        }

        const suggestions = commandHandler.commandSuggestions;
        const firstSuggestion = suggestions[0];
        const completionText = firstSuggestion.displayText || firstSuggestion.command || '';

        // 执行补全：使用第一个建议
        const completedText = completionText + ' '; // 补全后添加空格
        handleChange(completedText);

        return true; // 拦截按键，阻止默认行为
    }, [isCommandInput, commandHandler.commandSuggestions, handleChange]);

    // Handle skill completion - right arrow key
    const handleSkillCompletion = useCallback(() => {
        if (!skillAutocomplete.isActive) {
            return false;
        }

        const completedText = skillAutocomplete.complete(internalValue);
        handleChange(completedText);
        skillAutocomplete.hide();

        return true; // Intercept the key
    }, [skillAutocomplete, internalValue, handleChange]);

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

            {/* Skill autocomplete suggestions */}
            <SkillAutocompleteHintUI
                visible={skillAutocomplete.state.visible}
                skills={skillAutocomplete.state.filteredSkills}
                query={skillAutocomplete.state.query}
            />

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

                        // Handle right arrow for skill or command completion
                        if (key.rightArrow) {
                            // Try skill completion first
                            if (skillAutocomplete.isActive) {
                                const handled = handleSkillCompletion();
                                if (handled) return false;
                            }

                            // Then try command completion
                            const handled = handleCommandCompletion();
                            if (handled) return false;
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
                              : skillAutocomplete.isActive
                                ? '按 → 补全技能'
                                : placeholder
                    }
                />
            </Box>
        </Box>
    );
};

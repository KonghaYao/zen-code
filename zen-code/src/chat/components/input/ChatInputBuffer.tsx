import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Box, Text } from 'ink';
import { MultiLineTextInput } from 'ink-pro';
import { useChatInputBuffer } from '@codegraph/union-client';
import { useSkillAutocomplete } from '../../hooks/useSkillAutocomplete';
import { useAgentAutocomplete } from '../../hooks/useAgentAutocomplete';
import { SkillAutocompleteHintUI } from './SkillAutocompleteUI';
import { AgentAutocompleteHintUI } from './AgentAutocompleteUI';
import { colorizeInputLine } from './inputColorizer';
import type { Skill, Agent } from '@codegraph/config';
import { useBufferedMessageSender } from '../../hooks/useBufferedMessageSender';
import { useImagePaste, type AttachedImage } from './useImagePaste.js';
import { ImagePreviewUI } from './ImagePreviewUI.js';

export interface ChatInputBufferProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: (value: string, attachedImages?: AttachedImage[]) => void;
    loading: boolean;
    placeholder?: string;
    commandHandler: {
        isCommandInput: boolean;
        CommandHintUI: React.FC;
        commandSuggestions?: any[];
    };
    /** Available skills for autocomplete */
    skills?: Skill[];
    /** Available agents for autocomplete */
    agents?: Agent[];
}

export type { AttachedImage };

export const ChatInputBuffer: React.FC<ChatInputBufferProps> = ({
    value,
    onChange,
    onSubmit,
    loading,
    placeholder = '输入消息...',
    commandHandler,
    skills = [],
    agents = [],
}) => {
    useBufferedMessageSender();
    const { bufferedMessage, setBufferedMessage, clearBuffer } = useChatInputBuffer();
    const [internalValue, setInternalValue] = useState(value);
    const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);

    const {
        handlePaste: handleImagePaste,
        removeImage,
        clearImages,
    } = useImagePaste({
        attachedImages,
        onImagesChange: setAttachedImages,
    });

    // Prevent infinite loop: track if we're processing external value changes
    const isExternalUpdateRef = useRef(false);

    // Initialize skill autocomplete
    const skillAutocomplete = useSkillAutocomplete({
        skills,
        maxSuggestions: 5,
    });

    // Initialize agent autocomplete
    const agentAutocomplete = useAgentAutocomplete({
        agents,
        maxSuggestions: 5,
    });

    // 同步外部 value 变化（避免循环更新）
    useEffect(() => {
        // Only update if value actually changed and it's not from our own change
        if (value !== internalValue) {
            isExternalUpdateRef.current = true;
            setInternalValue(value);
        }
    }, [value]); // Only depend on value, NOT internalValue

    // 计算是否为命令输入（基于 internalValue）
    const isCommandInput = useMemo(() => internalValue.startsWith('/'), [internalValue]);

    // 计算是否处于「纯命令阶段」：以 / 开头且不含空格（命令名还未确定，尚未开始写参数）
    // /help → 纯命令阶段，屏蔽 skill 建议
    // /i djidji # → 已有参数，允许 skill 建议
    const isPureCommandPhase = useMemo(
        () => internalValue.startsWith('/') && !internalValue.includes(' '),
        [internalValue],
    );

    // Check for skill/agent autocomplete trigger when input changes
    // Intentionally omit checkTrigger functions from dependencies to avoid infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!isPureCommandPhase) {
            skillAutocomplete.checkTrigger(internalValue);
            agentAutocomplete.checkTrigger(internalValue);
        }
    }, [internalValue, isPureCommandPhase]);

    // 处理输入变化，同步到外部和命令检测（避免循环更新）
    const handleChange = useCallback(
        (newValue: string) => {
            // Skip if this is an external update
            if (isExternalUpdateRef.current) {
                isExternalUpdateRef.current = false;
                return;
            }

            setInternalValue(newValue);
            onChange(newValue); // 同步到外部 userInput，让 CommandHandler 能检测到
        },
        [onChange],
    );

    const handleSubmit = useCallback(
        (submitValue: string) => {
            if (!submitValue.trim() && attachedImages.length === 0) return;

            // Hide autocompletes on submit
            skillAutocomplete.hide();
            agentAutocomplete.hide();
            // 命令优先处理
            if (isCommandInput) {
                onSubmit(submitValue);
                setInternalValue('');
                return;
            }

            if (loading) {
                // AI 响应中：加入缓冲区（图片暂不支持缓冲区，等 AI 空闲再发）
                setBufferedMessage(submitValue);
                setInternalValue(''); // 清空输入框
            } else {
                // AI 空闲：直接发送，携带附件图片
                const imagesToSend = attachedImages.length > 0 ? [...attachedImages] : undefined;
                onSubmit(submitValue, imagesToSend);
                setInternalValue('');
                clearImages();
            }
        },
        [
            isCommandInput,
            loading,
            onSubmit,
            setBufferedMessage,
            skillAutocomplete,
            agentAutocomplete,
            attachedImages,
            clearImages,
        ],
    );

    // 处理 Esc 键清空缓冲区或关闭自动补全
    const handleEsc = useCallback(() => {
        // If agent autocomplete is open, close it first
        if (agentAutocomplete.isActive) {
            agentAutocomplete.hide();
            return;
        }

        // If skill autocomplete is open, close it
        if (skillAutocomplete.isActive) {
            skillAutocomplete.hide();
            return;
        }

        // 如果有附件图片，先移除最后一张
        if (attachedImages.length > 0) {
            removeImage(attachedImages[attachedImages.length - 1].id);
            return;
        }

        if (bufferedMessage) {
            clearBuffer(); // 清空缓冲区
        } else {
            setInternalValue(''); // 清空输入框
        }
    }, [
        bufferedMessage,
        clearBuffer,
        skillAutocomplete.isActive,
        agentAutocomplete.isActive,
        attachedImages,
        removeImage,
    ]);

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
    }, [skillAutocomplete.isActive, skillAutocomplete.complete, skillAutocomplete.hide, internalValue, handleChange]);

    // Handle agent completion - right arrow key
    const handleAgentCompletion = useCallback(() => {
        if (!agentAutocomplete.isActive) {
            return false;
        }

        const completedText = agentAutocomplete.complete(internalValue);
        handleChange(completedText);
        agentAutocomplete.hide();

        return true; // Intercept the key
    }, [agentAutocomplete.isActive, agentAutocomplete.complete, agentAutocomplete.hide, internalValue, handleChange]);

    // Get placeholder text based on current state
    const getPlaceholder = useMemo(() => {
        if (loading) {
            return bufferedMessage ? '按 Esc 清空缓冲区' : 'AI 响应中，Enter 将消息加入缓冲区';
        }
        if (isCommandInput) {
            return '输入命令... (试试 /help，按 → 补全第一个建议)';
        }
        if (agentAutocomplete.isActive) {
            return '按 → 补全 Agent';
        }
        if (skillAutocomplete.isActive) {
            return '按 → 补全技能';
        }
        return placeholder;
    }, [loading, bufferedMessage, isCommandInput, agentAutocomplete.isActive, skillAutocomplete.isActive, placeholder]);

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

            {/* Agent autocomplete suggestions */}
            <AgentAutocompleteHintUI
                visible={agentAutocomplete.state.visible}
                agents={agentAutocomplete.state.filteredAgents}
                query={agentAutocomplete.state.query}
            />

            {/* 附件图片预览 */}
            <ImagePreviewUI images={attachedImages} onRemove={removeImage} />

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
                    colorizeContent={colorizeInputLine}
                    onHotKey={(input, key) => {
                        if (key.escape) {
                            handleEsc();
                            return false; // 阻止默认行为
                        }

                        // Backspace：输入为空时移除最后一张图片
                        if (key.backspace && internalValue === '' && attachedImages.length > 0) {
                            removeImage(attachedImages[attachedImages.length - 1].id);
                            return false; // 阻止默认 backspace 行为
                        }

                        // Ctrl+V: 优先尝试图片粘贴
                        if (key.ctrl && input === 'v') {
                            handleImagePaste().then((handled) => {
                                // handled=false 时，ink 的默认粘贴行为会处理文字
                            });
                            // 返回 true 让 ink 继续处理（文字粘贴）
                            return true;
                        }

                        // Handle right arrow for autocompletions
                        if (key.rightArrow) {
                            // Try agent completion first
                            if (agentAutocomplete.isActive) {
                                const handled = handleAgentCompletion();
                                if (handled) return false;
                            }

                            // Then try skill completion
                            if (skillAutocomplete.isActive) {
                                const handled = handleSkillCompletion();
                                if (handled) return false;
                            }

                            // Finally try command completion
                            const handled = handleCommandCompletion();
                            if (handled) return false;
                        }

                        return true;
                    }}
                    placeholder={getPlaceholder}
                />
            </Box>
        </Box>
    );
};

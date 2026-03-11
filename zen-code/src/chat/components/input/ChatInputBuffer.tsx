import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Box, Text } from 'ink';
import { MultiLineTextInput } from 'ink-pro';
import { useChatInputBuffer } from '@codegraph/union-client';
import { useUnifiedAutocomplete } from '../../hooks/useUnifiedAutocomplete';
import { UnifiedAutocompleteUI } from './UnifiedAutocompleteUI';
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

    // Convert commandSuggestions to AutocompleteItem format
    const commandItems = useMemo(() => {
        if (!commandHandler.commandSuggestions) return [];
        return commandHandler.commandSuggestions.map((cmd: any) => ({
            id: cmd.command || cmd.name,
            name: cmd.command || cmd.name,
            displayText: cmd.displayText || cmd.command,
            description: cmd.description,
        }));
    }, [commandHandler.commandSuggestions]);

    // Initialize unified autocomplete
    const autocomplete = useUnifiedAutocomplete({
        commands: commandItems,
        skills,
        agents,
        maxVisible: 5,
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

    // Check for autocomplete trigger when input changes
    // Intentionally omit checkTrigger from dependencies to avoid infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        autocomplete.checkTrigger(internalValue);
    }, [internalValue]);

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

            // Hide autocomplete on submit
            autocomplete.hide();

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
        [isCommandInput, loading, onSubmit, setBufferedMessage, autocomplete, attachedImages, clearImages],
    );

    // 处理 Esc 键清空缓冲区或关闭自动补全
    const handleEsc = useCallback(() => {
        // If autocomplete is open, close it first
        if (autocomplete.isActive) {
            autocomplete.hide();
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
    }, [bufferedMessage, clearBuffer, autocomplete, attachedImages, removeImage]);

    // Get placeholder text based on current state
    const getPlaceholder = useMemo(() => {
        if (loading) {
            return bufferedMessage ? '按 Esc 清空缓冲区' : 'AI 响应中，Enter 将消息加入缓冲区';
        }
        if (autocomplete.isActive) {
            const type = autocomplete.state.type;
            if (type === 'command') return '↑↓ 选择, Tab/→ 补全命令';
            if (type === 'skill') return '↑↓ 选择, Tab/→ 补全技能';
            if (type === 'agent') return '↑↓ 选择, Tab/→ 补全 Agent';
        }
        if (isCommandInput) {
            return '输入命令... (试试 /help)';
        }
        return placeholder;
    }, [loading, bufferedMessage, isCommandInput, autocomplete.isActive, autocomplete.state.type, placeholder]);

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

            {/* Unified autocomplete suggestions */}
            <UnifiedAutocompleteUI
                visible={autocomplete.state.visible}
                type={autocomplete.state.type}
                items={autocomplete.state.items}
                selectedIndex={autocomplete.state.selectedIndex}
                query={autocomplete.state.query}
            />

            {/* 附件图片预览 */}
            <ImagePreviewUI images={attachedImages} onRemove={removeImage} />

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

                        // Handle autocomplete navigation and completion
                        if (autocomplete.isActive) {
                            // Up arrow - navigate to previous item
                            if (key.upArrow) {
                                autocomplete.selectPrev();
                                return false; // Prevent cursor movement
                            }

                            // Down arrow - navigate to next item
                            if (key.downArrow) {
                                autocomplete.selectNext();
                                return false; // Prevent cursor movement
                            }

                            // Tab or Right arrow - complete
                            if (key.tab || key.rightArrow) {
                                const completed = autocomplete.complete(internalValue);
                                handleChange(completed);
                                autocomplete.hide();
                                return false;
                            }
                        }

                        return true;
                    }}
                    placeholder={getPlaceholder}
                />
            </Box>
        </Box>
    );
};

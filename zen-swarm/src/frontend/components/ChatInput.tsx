/**
 * Chat Input Component
 * 消息输入框组件（极简风格）
 */

import React, { KeyboardEvent, useRef } from 'react';

interface ChatInputProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: (value: string) => void;
    loading?: boolean;
    disabled?: boolean;
    placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
    value,
    onChange,
    onSubmit,
    loading = false,
    disabled = false,
    placeholder = 'Type your message...',
}) => {
    const isDisabled = disabled || loading;
    const isComposingRef = useRef(false);

    const handleSubmit = () => {
        const trimmed = value.trim();
        if (trimmed && !isDisabled) {
            onSubmit(trimmed);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        // Only submit on Enter if not in IME composition mode
        if (e.key === 'Enter' && !e.shiftKey && !isComposingRef.current) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleCompositionStart = () => {
        isComposingRef.current = true;
    };

    const handleCompositionEnd = () => {
        isComposingRef.current = false;
    };

    return (
        <div className="border-t border-[var(--color-border-subtle)] p-4 bg-white">
            <div className="flex flex-col gap-3 max-w-4xl mx-auto">
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={handleCompositionEnd}
                    placeholder={loading ? 'AI is thinking...' : placeholder}
                    disabled={isDisabled}
                    rows={3}
                    className="w-full px-4 py-3 bg-[var(--color-bg-primary)] border border-[var(--color-border-default)] rounded-lg resize-none text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] disabled:bg-[var(--color-bg-tertiary)] disabled:text-[var(--color-text-tertiary)] disabled:cursor-not-allowed transition-colors duration-150"
                />
                <div className="flex justify-between items-center">
                    <span className="text-xs text-[var(--color-text-muted)]">
                        {loading ? 'AI is thinking...' : 'Press Enter to send, Shift+Enter for new line'}
                    </span>
                    <button onClick={handleSubmit} disabled={isDisabled || !value.trim()} className="btn-primary">
                        {loading ? 'Sending...' : 'Send'}
                    </button>
                </div>
            </div>
        </div>
    );
};

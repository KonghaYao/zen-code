/**
 * Chat Input Component
 * 消息输入框组件（深色主题）
 */

import React, { KeyboardEvent } from 'react';

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
    placeholder = '输入消息...',
}) => {
    const isDisabled = disabled || loading;

    const handleSubmit = () => {
        const trimmed = value.trim();
        if (trimmed && !isDisabled) {
            onSubmit(trimmed);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="border-t border-gray-700 p-4 bg-gray-900">
            <div className="flex flex-col gap-2">
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={loading ? 'AI 响应中...' : placeholder}
                    disabled={isDisabled}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-800 disabled:text-gray-500 placeholder-gray-400 text-white"
                />
                <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">
                        {loading ? '⏳ 响应中...' : '💡 按 Enter 发送，Shift+Enter 换行'}
                    </span>
                    <button
                        onClick={handleSubmit}
                        disabled={isDisabled || !value.trim()}
                        className="px-4 py-2 bg-teal-700 text-white rounded-md hover:bg-teal-600 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? '发送中...' : '发送'}
                    </button>
                </div>
            </div>
        </div>
    );
};

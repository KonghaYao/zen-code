/**
 * Chat Input Component
 * 消息输入框组件
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
        <div className="border-t border-gray-200 p-4 bg-white">
            <div className="flex flex-col gap-2">
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={loading ? 'AI 响应中...' : placeholder}
                    disabled={isDisabled}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
                />
                <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                        {loading ? '⏳ 响应中...' : '💡 按 Enter 发送，Shift+Enter 换行'}
                    </span>
                    <button
                        onClick={handleSubmit}
                        disabled={isDisabled || !value.trim()}
                        className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? '发送中...' : '发送'}
                    </button>
                </div>
            </div>
        </div>
    );
};

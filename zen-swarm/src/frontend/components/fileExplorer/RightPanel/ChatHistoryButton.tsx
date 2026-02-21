/**
 * ChatHistoryButton - 底部历史记录按钮
 * 小图标按钮，点击展开历史记录抽屉
 */

import React from 'react';

interface ChatHistoryButtonProps {
    onClick: () => void;
    isOpen: boolean;
}

export const ChatHistoryButton: React.FC<ChatHistoryButtonProps> = ({ onClick, isOpen }) => {
    return (
        <div className="flex justify-center py-1.5 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-tertiary)]">
            <button
                onClick={onClick}
                className={`
                    flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors
                    ${
                        isOpen
                            ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'
                    }
                `}
                title="View chat history"
            >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
                <span>History</span>
                <svg
                    className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
            </button>
        </div>
    );
};

export default ChatHistoryButton;

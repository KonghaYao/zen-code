/**
 * Modal 模态框组件（极简风格）
 */

import { useEffect, ReactElement } from 'react';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactElement;
}

export function Modal(props: ModalProps) {
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            props.onClose();
        }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            props.onClose();
        }
    };

    useEffect(() => {
        if (props.open) {
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [props.open]);

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-200 ${
                !props.open ? 'opacity-0 pointer-events-none' : ''
            }`}
            onClick={handleBackdropClick}
        >
            <div
                className={`
                    bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col border border-[var(--color-border-subtle)]
                    transition-all duration-200
                    ${!props.open ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}
                `}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)]">
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{props.title}</h3>
                    <button
                        onClick={props.onClose}
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors duration-150"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto text-[var(--color-text-primary)]">{props.children}</div>
            </div>
        </div>
    );
}

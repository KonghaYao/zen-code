/**
 * Modal 模态框组件（极简风格）
 */

import { useEffect, useRef, ReactNode } from 'react';
import { X } from './ui/Icons.js';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    size?: ModalSize;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-3xl',
    xl: 'max-w-4xl',
};

export function Modal(props: ModalProps) {
    const { size = 'md' } = props;
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            props.onClose();
        }
    };

    useEffect(() => {
        if (!props.open) return;

        // Focus the close button when modal opens
        closeButtonRef.current?.focus();

        // Trap focus within modal
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                props.onClose();
                return;
            }
            if (e.key !== 'Tab' || !panelRef.current) return;

            const focusable = panelRef.current.querySelectorAll<HTMLElement>(
                'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
            );
            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last?.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first?.focus();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [props.open, props.onClose]);

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-200 ${
                !props.open ? 'opacity-0 pointer-events-none' : ''
            }`}
            onClick={handleBackdropClick}
        >
            <div
                ref={panelRef}
                className={`
                    bg-white rounded-xl shadow-2xl w-full ${SIZE_CLASSES[size]} max-h-[85vh] overflow-hidden flex flex-col border border-neutral-200/50
                    transition-all duration-200
                    ${!props.open ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}
                `}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 bg-gradient-to-b from-neutral-50 to-white">
                    <h3 id="modal-title" className="text-base font-semibold text-neutral-800">
                        {props.title}
                    </h3>
                    <button
                        ref={closeButtonRef}
                        onClick={props.onClose}
                        aria-label="Close dialog"
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-700 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
                    >
                        <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">{props.children}</div>
            </div>
        </div>
    );
}

/**
 * Modal 模态框组件
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
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity ${
                !props.open ? 'opacity-0 pointer-events-none' : ''
            }`}
            onClick={handleBackdropClick}
        >
            <div
                className={`bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col ${
                    !props.open ? 'scale-95' : ''
                }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                    <h3 className="text-lg font-semibold text-white">{props.title}</h3>
                    <button onClick={props.onClose} className="text-gray-400 hover:text-white transition-colors">
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">{props.children}</div>
            </div>
        </div>
    );
}

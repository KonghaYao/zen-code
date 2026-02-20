/**
 * DropZone 组件 - 拖拽上传区域
 *
 * 仅响应拖拽上传，不拦截点击事件
 */

import React, { useState, useCallback, useRef } from 'react';

interface DropZoneProps {
    onUpload: (files: File[]) => Promise<void>;
    disabled?: boolean;
    children?: React.ReactNode;
}

export const DropZone: React.FC<DropZoneProps> = ({ onUpload, disabled = false, children }) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = useCallback(
        (e: React.DragEvent) => {
            if (disabled) return;
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(true);
        },
        [disabled],
    );

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback(
        async (e: React.DragEvent) => {
            if (disabled) return;
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(false);

            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                setIsUploading(true);
                try {
                    await onUpload(files);
                } finally {
                    setIsUploading(false);
                }
            }
        },
        [disabled, onUpload],
    );

    const handleFileSelect = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const files = Array.from(e.target.files || []);
            if (files.length > 0) {
                setIsUploading(true);
                try {
                    await onUpload(files);
                } finally {
                    setIsUploading(false);
                }
            }
            // 重置 input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        },
        [onUpload],
    );

    return (
        <div
            className={`
                relative min-h-full transition-all duration-200
                ${isDragOver ? 'bg-[var(--color-primary-light)]' : ''}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* 隐藏的文件输入 - 仅通过工具栏按钮触发 */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                disabled={disabled || isUploading}
            />

            {/* 拖拽覆盖层 */}
            {isDragOver && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-primary)]/10 backdrop-blur-sm rounded-2xl border-2 border-dashed border-[var(--color-primary)] pointer-events-none">
                    <div className="text-center">
                        <span className="text-4xl mb-2">📤</span>
                        <p className="text-lg font-medium text-[var(--color-primary)]">Drop files here to upload</p>
                    </div>
                </div>
            )}

            {/* 上传中覆盖层 */}
            {isUploading && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-2xl">
                    <div className="text-center">
                        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full mx-auto mb-3"></div>
                        <p className="text-[var(--color-text-primary)]">Uploading...</p>
                    </div>
                </div>
            )}

            {/* 子内容 */}
            {children}
        </div>
    );
};

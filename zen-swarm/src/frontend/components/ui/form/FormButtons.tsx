/**
 * FormButtons 组件 - 通用表单按钮组
 *
 * 用途：
 * - 统一的表单按钮布局
 * - 处理加载状态和禁用状态
 */

import { ReactNode } from 'react';

interface FormButtonsProps {
    onCancel: () => void;
    isSaving?: boolean;
    isEditing?: boolean;
    saveText?: string;
    cancelText?: string;
    extra?: ReactNode;
}

export function FormButtons(props: FormButtonsProps) {
    const { onCancel, isSaving = false, isEditing = false, saveText, cancelText = 'Cancel', extra } = props;

    const defaultSaveText = isEditing ? 'Update' : 'Create';

    return (
        <div className="flex justify-between items-center pt-2">
            <div>{extra}</div>
            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSaving}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 rounded-lg text-sm font-medium transition-colors"
                >
                    {cancelText}
                </button>
                <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 rounded-lg text-sm font-medium transition-colors"
                >
                    {isSaving ? 'Saving...' : saveText || defaultSaveText}
                </button>
            </div>
        </div>
    );
}

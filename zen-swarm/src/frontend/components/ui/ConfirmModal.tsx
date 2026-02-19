/**
 * ConfirmModal 组件 - 非阻塞式确认对话框
 *
 * 用途：
 * - 替代浏览器原生的 confirm()，避免阻塞主线程
 * - 提供更好的用户体验和一致的 UI 风格
 *
 * 规则引用：rerender-move-effect-to-event
 */
import { Modal } from '../Modal.js';

interface ConfirmModalProps {
    /** 是否显示 */
    open: boolean;
    /** 标题 */
    title?: string;
    /** 确认消息 */
    message: string;
    /** 确认按钮文本 */
    confirmText?: string;
    /** 取消按钮文本 */
    cancelText?: string;
    /** 确认按钮样式 */
    confirmVariant?: 'danger' | 'primary';
    /** 确认回调 */
    onConfirm: () => void;
    /** 取消回调 */
    onCancel: () => void;
    /** 是否在加载中 */
    isLoading?: boolean;
}

export function ConfirmModal(props: ConfirmModalProps) {
    const {
        open,
        title = '确认操作',
        message,
        confirmText = '确认',
        cancelText = '取消',
        confirmVariant = 'danger',
        onConfirm,
        onCancel,
        isLoading = false,
    } = props;

    const handleConfirm = () => {
        onConfirm();
    };

    const handleCancel = () => {
        onCancel();
    };

    return (
        <Modal open={open} onClose={onCancel} title={title}>
            <div className="space-y-6">
                <p className="text-gray-300">{message}</p>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={handleCancel}
                        disabled={isLoading}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 rounded-lg text-sm font-medium transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            confirmVariant === 'danger'
                                ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-900'
                                : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800'
                        }`}
                    >
                        {isLoading ? '处理中...' : confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

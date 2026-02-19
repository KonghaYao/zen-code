/**
 * ConfirmModal 组件 - 非阻塞式确认对话框（极简风格）
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
        title = 'Confirm Action',
        message,
        confirmText = 'Confirm',
        cancelText = 'Cancel',
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
                <p className="text-[var(--color-text-secondary)]">{message}</p>

                <div className="flex justify-end gap-3">
                    <button onClick={handleCancel} disabled={isLoading} className="btn-secondary">
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className={confirmVariant === 'danger' ? 'btn-danger' : 'btn-primary'}
                    >
                        {isLoading ? 'Processing...' : confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

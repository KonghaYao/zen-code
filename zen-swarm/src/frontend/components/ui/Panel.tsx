/**
 * 通用 Panel 组件 - 减少各个 Panel 的重复代码（极简风格）
 *
 * 用途：
 * - 统一的 Panel 结构（标题、创建按钮、列表、空状态、错误显示）
 * - 自动处理 Modal 和 ConfirmModal
 */

import { ReactNode } from 'react';
import { ErrorDisplay, EmptyState } from '../ErrorDisplay.js';
import { ConfirmModal } from './ConfirmModal.js';
import { Modal } from '../Modal.js';

interface PanelConfig<T> {
    /** 资源名称（用于标题和提示文本） */
    resourceName: string;
    /** 创建按钮文本 */
    createButtonText?: string;
    /** 空状态消息 */
    emptyStateMessage?: string;
    /** 删除确认消息 */
    deleteConfirmMessage?: string;
    /** Modal 标题前缀 */
    modalTitlePrefix?: string;
}

interface PanelProps<T> {
    /** Panel 配置 */
    config: PanelConfig<T>;
    /** 数据列表 */
    items: T[];
    /** 是否加载中 */
    isLoading: boolean;
    /** 错误信息 */
    error: Error | null;
    /** 列表项渲染函数 */
    renderItem: (item: T) => ReactNode;
    /** 创建按钮点击回调 */
    onCreate: () => void;
    /** 重试回调 */
    onRetry: () => void;
    /** Modal 相关 */
    modal?: {
        open: boolean;
        title: string;
        onClose: () => void;
        children: ReactNode;
    };
    /** 删除确认 Modal 相关 */
    deleteModal?: {
        open: boolean;
        onConfirm: () => void;
        onCancel: () => void;
        isLoading: boolean;
    };
}

export function GenericPanel<T>(props: PanelProps<T>) {
    const { config, items, isLoading, error, renderItem, onCreate, onRetry, modal, deleteModal } = props;

    const {
        resourceName,
        createButtonText = `+ Create ${resourceName}`,
        emptyStateMessage = `No ${resourceName.toLowerCase()} yet. Create your first ${resourceName.toLowerCase()}!`,
        deleteConfirmMessage = `Are you sure you want to delete this ${resourceName.toLowerCase()}? This action cannot be undone.`,
        modalTitlePrefix = resourceName,
    } = config;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-[var(--color-text-primary)] flex items-center gap-3">
                    {resourceName}
                    <span className="badge badge-primary">{items.length}</span>
                </h2>
                <button onClick={onCreate} className="btn-primary">
                    {createButtonText}
                </button>
            </div>

            {/* Error */}
            {error && <ErrorDisplay error={error.message} onRetry={onRetry} />}

            {/* Empty State */}
            {!isLoading && !error && items.length === 0 && (
                <EmptyState
                    message={emptyStateMessage}
                    action={{ label: createButtonText.replace('+ ', ''), onClick: onCreate }}
                />
            )}

            {/* List */}
            {!isLoading && !error && items.length > 0 && (
                <div className="grid gap-4">
                    {items.map((item, index) => (
                        <div key={index}>{renderItem(item)}</div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {modal && (
                <Modal open={modal.open} onClose={modal.onClose} title={modal.title}>
                    {modal.children}
                </Modal>
            )}

            {/* Delete Confirm Modal */}
            {deleteModal && (
                <ConfirmModal
                    open={deleteModal.open}
                    title={`Delete ${resourceName}`}
                    message={deleteConfirmMessage}
                    confirmText="Delete"
                    cancelText="Cancel"
                    confirmVariant="danger"
                    onConfirm={deleteModal.onConfirm}
                    onCancel={deleteModal.onCancel}
                    isLoading={deleteModal.isLoading}
                />
            )}
        </div>
    );
}

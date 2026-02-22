/**
 * 通用 Panel 组件 - 减少各个 Panel 的重复代码（极简风格）
 *
 * 用途：
 * - 统一的 Panel 结构（标题、创建按钮、列表、空状态、错误显示）
 * - 自动处理 Modal 和 ConfirmModal
 * - 支持 macOS 风格红绿灯按钮
 */

import { ReactNode } from 'react';
import { ErrorDisplay, EmptyState } from '../ErrorDisplay.js';
import { ConfirmModal } from './ConfirmModal.js';
import { Modal } from '../Modal.js';
import { TrafficLights } from './TrafficLights.js';

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
    /** macOS 红绿灯 - 关闭回调 */
    onClose?: () => void;
    /** 是否显示红绿灯（默认 true） */
    showTrafficLights?: boolean;
}

export function GenericPanel<T>(props: PanelProps<T>) {
    const {
        config,
        items,
        isLoading,
        error,
        renderItem,
        onCreate,
        onRetry,
        modal,
        deleteModal,
        onClose,
        showTrafficLights = true,
    } = props;

    const {
        resourceName,
        createButtonText = `+ Create ${resourceName}`,
        emptyStateMessage = `No ${resourceName.toLowerCase()} yet. Create your first ${resourceName.toLowerCase()}!`,
        deleteConfirmMessage = `Are you sure you want to delete this ${resourceName.toLowerCase()}? This action cannot be undone.`,
        modalTitlePrefix = resourceName,
    } = config;

    return (
        <div className="flex flex-col h-full">
            {/* macOS Style Header with Traffic Lights */}
            {showTrafficLights && (
                <header className="flex-shrink-0 bg-transparent px-4 py-3 flex items-center justify-between border-b border-[var(--color-border-subtle)]">
                    <div className="flex items-center gap-3">
                        <TrafficLights onClose={onClose} />
                        <h2 className="text-xl font-semibold text-[var(--color-text-primary)] flex items-center gap-3 ml-2">
                            {resourceName}
                            <span className="badge badge-primary">{items.length}</span>
                        </h2>
                    </div>
                    <button onClick={onCreate} className="btn-primary">
                        {createButtonText}
                    </button>
                </header>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-6 space-y-6">
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
            </div>

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

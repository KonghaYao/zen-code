/**
 * useModal hook - 统一的模态框状态管理
 *
 * 用途：
 * - 统一管理各个 Panel 的 showModal、editingItem 状态
 * - 消除重复的状态管理代码
 *
 * 规则引用：rerender-derived-state
 */
import { useState, useCallback } from 'react';

interface UseModalOptions<T> {
    /** 是否正在加载 */
    isLoading?: boolean;
}

interface UseModalReturn<T> {
    /** 是否显示模态框 */
    isOpen: boolean;
    /** 正在编辑的项目 */
    editingItem: T | null;
    /** 打开创建模态框 */
    openCreate: () => void;
    /** 打开编辑模态框 */
    openEdit: (item: T) => void;
    /** 关闭模态框 */
    close: () => void;
    /** 获取模态框标题 */
    getTitle: (type: string) => string;
}

export function useModal<T>(options: UseModalOptions<T> = {}): UseModalReturn<T> {
    const { isLoading = false } = options;

    const [isOpen, setIsOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<T | null>(null);

    const openCreate = useCallback(() => {
        setEditingItem(null);
        setIsOpen(true);
    }, []);

    const openEdit = useCallback((item: T) => {
        setEditingItem(item);
        setIsOpen(true);
    }, []);

    const close = useCallback(() => {
        if (!isLoading) {
            setIsOpen(false);
            setEditingItem(null);
        }
    }, [isLoading]);

    const getTitle = useCallback(
        (type: string) => {
            return editingItem ? `Edit ${type}` : `Create ${type}`;
        },
        [editingItem],
    );

    return {
        isOpen,
        editingItem,
        openCreate,
        openEdit,
        close,
        getTitle,
    };
}

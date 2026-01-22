/**
 * 统一面板系统 - 导航 Hook
 */

import { useState, useCallback } from 'react';
import { useInput } from '../../../utils/use-input';
import type { PanelContext, PanelKeyMap } from './types';

interface UsePanelNavigationOptions<T> {
    items: T[];
    initialIndex?: number;
    visibleCount?: number;
    filteredItems?: T[];
    onSelect?: (item: T) => void | Promise<void>;
    onClose?: () => void;
    onSearch?: () => void;
    onFilter?: () => void;
    keyMap?: PanelKeyMap<T>;
}

interface UsePanelNavigationResult {
    selectedIndex: number;
    setSelectedIndex: (index: number) => void;
    searchMode: boolean;
    setSearchMode: (mode: boolean) => void;
}

/**
 * 导航 Hook
 */
export function usePanelNavigation<T>(options: UsePanelNavigationOptions<T>): UsePanelNavigationResult {
    const {
        items,
        initialIndex = 0,
        visibleCount = 20,
        filteredItems = items,
        onSelect,
        onClose,
        onSearch,
        onFilter,
        keyMap = {},
    } = options;

    const [selectedIndex, setSelectedIndex] = useState(initialIndex);
    const [searchMode, setSearchMode] = useState(false);

    // 构建面板上下文 (传递给自定义快捷键)
    const buildContext = useCallback((): PanelContext<T> => {
        return {
            items,
            filteredItems,
            selectedIndex,
            setSelectedIndex,
            searchTerm: '',
            setSearchTerm: () => {},
            activeFilter: 'all',
            setActiveFilter: () => {},
            onClose: onClose || (() => {}),
        };
    }, [items, filteredItems, selectedIndex, setSelectedIndex, onClose]);

    useInput((input, key) => {
        // 搜索模式优先处理
        if (searchMode) {
            if (key.escape) {
                setSearchMode(false);
            } else if (key.return) {
                setSearchMode(false);
            }
            return;
        }

        // 激活搜索
        if (input === '/') {
            onSearch?.();
            setSearchMode(true);
            return;
        }

        // 激活过滤器切换
        if (input === 'Tab') {
            onFilter?.();
            return;
        }

        // 通用快捷键
        if (input === 'q' || input === 'c' || key.escape) {
            onClose?.();
            return;
        }

        // 数字键快速跳转
        if (/^[1-9]$/.test(input)) {
            const index = parseInt(input) - 1;
            if (index < items.length) {
                setSelectedIndex(index);
                if (onSelect) {
                    onSelect(items[index]);
                }
            }
            return;
        }

        // 自定义快捷键
        const customHandler = keyMap[input];
        if (customHandler) {
            const context = buildContext();
            customHandler(context);
            return;
        }

        // 自定义快捷键 (组合键)
        if (key.ctrl || key.meta) {
            const comboKey = `${key.ctrl ? 'Ctrl' : 'Meta'}+${input}`;
            const comboHandler = keyMap[comboKey];
            if (comboHandler) {
                const context = buildContext();
                comboHandler(context);
            }
            return;
        }

        // 导航快捷键
        if (items.length === 0) return;

        switch (true) {
            case key.upArrow:
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
                break;

            case key.downArrow:
                setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
                break;

            case key.pageUp:
                setSelectedIndex((prev) => Math.max(0, prev - visibleCount));
                break;

            case key.pageDown:
                setSelectedIndex((prev) => Math.min(items.length - 1, prev + visibleCount));
                break;

            case key.home:
                setSelectedIndex(0);
                break;

            case key.end:
                setSelectedIndex(items.length - 1);
                break;

            case key.return:
                if (onSelect) {
                    const selectedItem = items[selectedIndex];
                    if (selectedItem) {
                        onSelect(selectedItem);
                    }
                }
                break;
        }
    });

    return {
        selectedIndex,
        setSelectedIndex,
        searchMode,
        setSearchMode,
    };
}

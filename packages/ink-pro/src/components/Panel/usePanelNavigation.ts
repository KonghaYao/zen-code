/**
 * 统一面板系统 - 导航 Hook
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useInput } from '../../utils';
import type { PanelContext, PanelKeyMap } from './types';

interface UsePanelNavigationOptions<T> {
    items: T[];
    initialIndex?: number;
    visibleCount?: number;
    filteredItems?: T[];
    onSelect?: (item: T) => void | Promise<void>;
    onDelete?: (item: T) => void | Promise<void>;
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
        onDelete,
        onClose,
        onSearch,
        onFilter,
        keyMap = {},
    } = options;

    const [selectedIndex, setSelectedIndex] = useState(initialIndex);
    const [searchMode, setSearchMode] = useState(false);

    // 当 initialIndex 变化时，更新 selectedIndex（例如数据加载完成后）
    useEffect(() => {
        setSelectedIndex(initialIndex);
    }, [initialIndex]);

    // 使用 ref 存储可变函数，避免在 buildContext 中依赖它们造成循环
    const setSelectedIndexRef = useRef(setSelectedIndex);
    const onCloseRef = useRef(onClose);

    // 同步 ref
    useEffect(() => {
        setSelectedIndexRef.current = setSelectedIndex;
    }, [setSelectedIndex]);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    // 构建面板上下文 (传递给自定义快捷键) - 优化：使用 ref 避免依赖循环
    const buildContext = useCallback((): PanelContext<T> => {
        return {
            items,
            filteredItems,
            selectedIndex,
            setSelectedIndex: setSelectedIndexRef.current,
            searchTerm: '',
            setSearchTerm: () => {},
            activeFilter: 'all',
            setActiveFilter: () => {},
            onClose: onCloseRef.current || (() => {}),
        };
    }, [items, filteredItems, selectedIndex]);

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
        if (key.tab) {
            onFilter?.();
            return;
        }

        // 通用快捷键
        if (key.escape) {
            onClose?.();
            return;
        }

        // 自定义快捷键 - 处理特殊键（箭头键等）
        if (key.upArrow && keyMap.upArrow) {
            const context = buildContext();
            keyMap.upArrow(context);
            return;
        }
        if (key.downArrow && keyMap.downArrow) {
            const context = buildContext();
            keyMap.downArrow(context);
            return;
        }
        if (key.leftArrow && keyMap.leftArrow) {
            const context = buildContext();
            keyMap.leftArrow(context);
            return;
        }
        if (key.rightArrow && keyMap.rightArrow) {
            const context = buildContext();
            keyMap.rightArrow(context);
            return;
        }
        if (key.pageUp && keyMap.pageUp) {
            const context = buildContext();
            keyMap.pageUp(context);
            return;
        }
        if (key.pageDown && keyMap.pageDown) {
            const context = buildContext();
            keyMap.pageDown(context);
            return;
        }
        if (key.home && keyMap.home) {
            const context = buildContext();
            keyMap.home(context);
            return;
        }
        if (key.end && keyMap.end) {
            const context = buildContext();
            keyMap.end(context);
            return;
        }

        // 自定义快捷键（普通字符）
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
                return;
            }
        }

        // 导航快捷键（基于过滤后的列表）
        if (filteredItems.length === 0) return;

        switch (true) {
            case key.upArrow:
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
                break;

            case key.downArrow:
                setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
                break;

            case key.pageUp:
                setSelectedIndex((prev) => Math.max(0, prev - visibleCount));
                break;

            case key.pageDown:
                setSelectedIndex((prev) => Math.min(filteredItems.length - 1, prev + visibleCount));
                break;

            case key.home:
                setSelectedIndex(0);
                break;

            case key.end:
                setSelectedIndex(filteredItems.length - 1);
                break;

            case key.return:
                if (onSelect) {
                    const selectedItem = filteredItems[selectedIndex];
                    if (selectedItem) {
                        onSelect(selectedItem);
                    }
                }
                break;

            case key.backspace:
            case key.delete:
                if (onDelete) {
                    const selectedItem = filteredItems[selectedIndex];
                    if (selectedItem) {
                        onDelete(selectedItem);
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

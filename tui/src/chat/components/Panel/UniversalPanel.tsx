/**
 * 统一面板系统 - 统一面板组件
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Text } from 'ink';
import { PanelContainer } from './PanelContainer';
import { SearchBar } from './SearchBar';
import { VirtualScrollList } from './VirtualScrollList';
import { usePanelSearch } from './usePanelSearch';
import { usePanelNavigation } from './usePanelNavigation';
import type { UniversalPanelProps, PanelContext } from './types';

/**
 * 统一面板组件
 */
export function UniversalPanel<T extends Record<string, any>>({ config, onClose }: UniversalPanelProps<T>) {
    const [items, setItems] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);

    // 加载数据
    useEffect(() => {
        const load = async () => {
            try {
                const data = await config.dataSource();
                setItems(data);
            } catch (error) {
                console.error(`Failed to load data for panel ${config.id}:`, error);
                setItems([]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [config.id, config.dataSource]);

    // 搜索和过滤
    const { searchTerm, setSearchTerm, activeFilter, setActiveFilter, filteredItems } = usePanelSearch<T>({
        items,
        searchFields: config.searchFields,
        filters: config.filters,
        defaultFilter: config.defaultFilter,
    });

    // 初始化选中项
    const initialIndex = useMemo(() => {
        if (config.isSelected) {
            return filteredItems.findIndex(config.isSelected);
        }
        return 0;
    }, [filteredItems, config]);

    // 导航逻辑
    const { selectedIndex } = usePanelNavigation<T>({
        items: filteredItems,
        initialIndex,
        visibleCount: config.visibleCount,
        onSelect: config.onSelect,
        onClose,
        onSearch: () => setSearchTerm(''),
        onFilter: () => {
            // Tab 键切换过滤器
            if (config.filters && config.filters.length > 0) {
                const allFilters = ['all', ...config.filters.map((f) => f.id)];
                const currentIndex = allFilters.indexOf(activeFilter);
                const nextIndex = (currentIndex + 1) % allFilters.length;
                setActiveFilter(allFilters[nextIndex]);
            }
        },
        keyMap: config.keyMap,
    });

    // 加载中状态
    if (loading) {
        return (
            <PanelContainer title={config.title} icon={config.icon} count={config.showCount ? items.length : undefined}>
                <Text color="gray">加载中...</Text>
            </PanelContainer>
        );
    }

    // 空数据状态
    if (items.length === 0) {
        return (
            <PanelContainer title={config.title} icon={config.icon} count={0}>
                {config.renderEmpty ? config.renderEmpty() : <Text color="gray">暂无数据</Text>}
            </PanelContainer>
        );
    }

    const visibleCount = config.visibleCount || 8;
    const itemHeight = config.itemHeight;

    return (
        <PanelContainer
            title={config.title}
            icon={config.icon}
            count={config.showCount ? items.length : undefined}
            statusInfo={config.statusInfo?.(filteredItems)}
        >
            {/* 虚拟滚动列表 */}
            <Box flexGrow={1}>
                <VirtualScrollList
                    items={filteredItems}
                    selectedIndex={selectedIndex}
                    itemHeight={itemHeight}
                    visibleCount={visibleCount}
                    renderItem={config.renderItem}
                />
            </Box>

            {/* 搜索栏 - 移到下方 */}
            {(config.searchable || config.filterable) && (
                <Box marginTop={1} width="100%">
                    <SearchBar
                        searchTerm={searchTerm}
                        onSearchTermChange={setSearchTerm}
                        activeFilter={activeFilter}
                        filters={config.filters}
                        onFilterChange={setActiveFilter}
                        placeholder={config.searchPlaceholder || '搜索...'}
                        filteredCount={filteredItems.length}
                        totalCount={items.length}
                    />
                </Box>
            )}
            {/* 固定快捷键提示 */}
            <Box gap={2} paddingY={1}>
                <Text color="gray">
                    <Text color="cyan" bold>
                        ↑↓
                    </Text>
                    :导航
                    <Text color="cyan" bold>
                        Enter
                    </Text>
                    :确认
                    <Text color="cyan" bold>
                        1-9
                    </Text>
                    :跳转
                    <Text color="cyan" bold>
                        q
                    </Text>
                    :关闭
                </Text>
            </Box>
        </PanelContainer>
    );
}

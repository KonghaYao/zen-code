/**
 * 统一面板系统 - 统一面板组件
 */

import { useState, useEffect, useMemo } from 'react';
import { Box, Text } from 'ink';
import { PanelContainer } from './PanelContainer';
import { SearchBar } from './SearchBar';
import { VirtualScrollList } from './VirtualScrollList';
import { usePanelSearch } from './usePanelSearch';
import { usePanelNavigation } from './usePanelNavigation';
import type { UniversalPanelProps } from './types';

/**
 * 统一面板组件
 */
export function UniversalPanel<T extends Record<string, any>>({ config, onClose }: UniversalPanelProps<T>) {
    const [items, setItems] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);

    // 使用 useMemo 缓存 config 的关键值，避免因 config 对象引用变化导致 useEffect 重复执行
    // 这是修复死循环的关键：即使父组件每次渲染都创建新的 config 对象，这些缓存的值也会保持稳定
    const dataSource = useMemo(() => config.dataSource, [config.dataSource]);
    const id = useMemo(() => config.id, [config.id]);
    const searchFields = useMemo(() => config.searchFields, [config.searchFields]);
    const filters = useMemo(() => config.filters, [config.filters]);
    const defaultFilter = useMemo(() => config.defaultFilter, [config.defaultFilter]);
    const isSelected = useMemo(() => config.isSelected, [config.isSelected]);
    const visibleCount = useMemo(() => config.visibleCount, [config.visibleCount]);
    const itemHeight = useMemo(() => config.itemHeight, [config.itemHeight]);
    const renderItem = useMemo(() => config.renderItem, [config.renderItem]);
    const onSelect = useMemo(() => config.onSelect, [config.onSelect]);
    const onDelete = useMemo(() => config.onDelete, [config.onDelete]);
    const showCount = useMemo(() => config.showCount, [config.showCount]);
    const statusInfo = useMemo(() => config.statusInfo, [config.statusInfo]);
    const searchable = useMemo(() => config.searchable, [config.searchable]);
    const filterable = useMemo(() => config.filterable, [config.filterable]);
    const searchPlaceholder = useMemo(() => config.searchPlaceholder, [config.searchPlaceholder]);
    const keyMap = useMemo(() => config.keyMap, [config.keyMap]);

    // 加载数据 - 只依赖 dataSource 和 id
    useEffect(() => {
        const load = async () => {
            try {
                const data = await dataSource();
                setItems(data || []);
            } catch (error) {
                console.error(`Failed to load data for panel ${id}:`, error);
                setItems([]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [dataSource, id]);

    // 搜索和过滤 - 确保 items 总是一个数组
    const { searchTerm, setSearchTerm, activeFilter, setActiveFilter, filteredItems } = usePanelSearch<T>({
        items: items || [],
        searchFields,
        filters,
        defaultFilter,
    });

    // 初始化选中项
    const initialIndex = useMemo(() => {
        // 确保 filteredItems 不为 undefined
        const safeFilteredItems = filteredItems || [];
        if (isSelected && safeFilteredItems.length > 0) {
            const index = safeFilteredItems.findIndex(isSelected);
            return index >= 0 ? index : 0;
        }
        return 0;
    }, [filteredItems, isSelected]);

    // 导航逻辑
    const { selectedIndex } = usePanelNavigation<T>({
        items: filteredItems || [],
        initialIndex,
        visibleCount,
        onSelect,
        onDelete,
        onClose,
        onSearch: () => setSearchTerm(''),
        onFilter: () => {
            // Tab 键切换过滤器
            if (filters && filters.length > 0) {
                const allFilters = ['all', ...filters.map((f) => f.id)];
                const currentIndex = allFilters.indexOf(activeFilter);
                const nextIndex = (currentIndex + 1) % allFilters.length;
                setActiveFilter(allFilters[nextIndex]);
            }
        },
        keyMap,
    });

    // 加载中状态
    if (loading) {
        return (
            <PanelContainer title={config.title} icon={config.icon} count={showCount ? items.length : undefined}>
                <Text color="gray">加载中...</Text>
            </PanelContainer>
        );
    }

    // 空数据状态
    if (!items || items.length === 0) {
        return (
            <PanelContainer title={config.title} icon={config.icon} count={0}>
                {config.renderEmpty ? config.renderEmpty() : <Text color="gray">暂无数据</Text>}
            </PanelContainer>
        );
    }

    const displayVisibleCount = visibleCount || 8;
    const safeFilteredItems = filteredItems || [];
    const safeItems = items || [];

    return (
        <PanelContainer
            title={config.title}
            icon={config.icon}
            count={showCount ? safeItems.length : undefined}
            statusInfo={statusInfo?.(safeFilteredItems)}
        >
            {/* 虚拟滚动列表 */}
            <Box flexGrow={1}>
                <VirtualScrollList
                    items={safeFilteredItems}
                    selectedIndex={selectedIndex}
                    itemHeight={itemHeight}
                    visibleCount={displayVisibleCount}
                    renderItem={renderItem}
                />
            </Box>

            {/* 搜索栏 - 移到下方 */}
            {(searchable || filterable) && (
                <Box marginTop={1} width="100%">
                    <SearchBar
                        searchTerm={searchTerm}
                        onSearchTermChange={setSearchTerm}
                        activeFilter={activeFilter}
                        filters={filters}
                        onFilterChange={setActiveFilter}
                        placeholder={searchPlaceholder || '搜索...'}
                        filteredCount={safeFilteredItems.length}
                        totalCount={safeItems.length}
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
                    {onDelete && (
                        <>
                            <Text color="cyan" bold>
                                {' '}
                                Backspace
                            </Text>
                            :删除
                        </>
                    )}
                    <Text color="cyan" bold>
                        {' '}
                        /
                    </Text>
                    :搜索
                    {filterable && (
                        <>
                            <Text color="cyan" bold>
                                {' '}
                                Tab
                            </Text>
                            :过滤
                        </>
                    )}
                    <Text color="cyan" bold>
                        {' '}
                        ESC
                    </Text>
                    :关闭
                </Text>
            </Box>
        </PanelContainer>
    );
}

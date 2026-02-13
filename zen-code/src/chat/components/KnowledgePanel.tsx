/**
 * Knowledge 面板 - 使用统一面板系统重构 + TanStack Query
 *
 * 使用 TanStack Query 管理知识库状态
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Box, Text } from 'ink';
import { UniversalPanel } from 'ink-pro';
import { PanelConfig, PanelContext } from 'ink-pro';
import { useKnowledge } from '../hooks/useKnowledge';
import { cleanPath } from '@codegraph/union-client';
import type { KnowledgeItem } from '../hooks/useKnowledge';

interface KnowledgePanelProps {
    onClose: () => void;
}

// 辅助函数 - 提取到组件外部
const formatDescription = (description: string) => {
    return description.length > 80 ? description.slice(0, 80) + '...' : description;
};

const KnowledgePanel: React.FC<KnowledgePanelProps> = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState<'memories' | 'skills'>('memories');

    // 使用 ref 存储 setActiveTab，避免 keyMap 回调引用变化
    const setActiveTabRef = useRef(setActiveTab);

    React.useEffect(() => {
        setActiveTabRef.current = setActiveTab;
    }, [setActiveTab]);

    // 使用 TanStack Query 加载知识库
    const { data: memories = [] } = useKnowledge({ type: 'memories', enabled: activeTab === 'memories' });
    const { data: skills = [] } = useKnowledge({ type: 'skills', enabled: activeTab === 'skills' });

    // dataSource 返回当前 tab 的数据
    const dataSource = useCallback(async () => {
        return activeTab === 'memories' ? memories : skills;
    }, [activeTab, memories, skills]);

    // renderItem - 使用 useCallback 保持引用稳定
    const renderItem = useCallback((item: any, index: number, isSelected: boolean) => {
        const description = formatDescription(item.description);

        return (
            <Box key={item.path} flexDirection="column" paddingY={1}>
                <Box>
                    <Text bold color={isSelected ? 'cyan' : 'gray'}>
                        {index + 1}. {item.name}
                    </Text>
                </Box>
                <Box paddingY={1}>
                    <Text color={isSelected ? 'white' : 'gray'}>{description}</Text>
                </Box>
                <Box>
                    <Text color="cyan" dimColor={!isSelected}>
                        {cleanPath(item.path)}
                        {item.category && <Text color="yellow"> {item.category}</Text>}
                    </Text>
                </Box>
            </Box>
        );
    }, []);

    // onSelect - 使用 useCallback 保持引用稳定
    const handleSelect = useCallback((item: KnowledgeItem) => {
        // 只读，不执行操作
        console.log('Selected knowledge item:', item.name);
    }, []);

    // filters - 使用 useMemo 缓存
    const filters = useMemo(
        () => [
            {
                id: 'memory',
                label: '记忆',
                predicate: (item: KnowledgeItem) => item.type === 'memory',
            },
            {
                id: 'skill',
                label: '技能',
                predicate: (item: KnowledgeItem) => item.type === 'skill',
            },
        ],
        [],
    );

    // keyMap - 使用 useMemo 缓存
    const keyMap = useMemo(
        () => ({
            h: (context: PanelContext<KnowledgeItem>) => {
                setActiveTabRef.current('memories');
                context.setActiveFilter('memory');
            },
            s: (context: PanelContext<KnowledgeItem>) => {
                setActiveTabRef.current('skills');
                context.setActiveFilter('skill');
            },
        }),
        [],
    );

    // panelConfig - 使用 useMemo 缓存
    const panelConfig: PanelConfig<KnowledgeItem> = useMemo(
        () => ({
            id: 'knowledge',
            title: '知识库',
            icon: '📚',

            dataSource: dataSource,

            // 搜索配置
            searchable: true,
            searchFields: ['name', 'description'],
            searchPlaceholder: '搜索知识库 (名称/描述/分类)...',

            // 过滤配置
            filterable: true,
            filters: filters,
            defaultFilter: activeTab === 'memories' ? 'memory' : 'skill',

            // 渲染配置
            itemHeight: 8, // 每个 knowledge item 占 4 行
            visibleCount: 3,

            renderItem: renderItem,

            showCount: true,

            onSelect: handleSelect,

            keyMap: keyMap,
        }),
        [dataSource, filters, renderItem, handleSelect, keyMap, activeTab],
    );

    return <UniversalPanel config={panelConfig} onClose={onClose} />;
};

export default KnowledgePanel;

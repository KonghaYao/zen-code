/**
 * Knowledge 面板 - 使用统一面板系统重构
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Box, Text } from 'ink';
import { join } from 'path';
import { UniversalPanel } from 'ink-pro';
import { PanelConfig, PanelContext } from 'ink-pro';
import { listMemories, type MemoryMetadata } from '@codegraph/agent/src/memories/load';
import { listSkills, type SkillMetadata } from '@langgraph-js/standard-agent';
import { cleanPath } from '@codegraph/union-client';

interface KnowledgePanelProps {
    onClose: () => void;
}

type KnowledgeItem = (MemoryMetadata | SkillMetadata) & { type: 'memory' | 'skill' };

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

    // 修复：使用 useCallback 保持 dataSource 引用稳定
    const loadKnowledge = useCallback(async (): Promise<KnowledgeItem[]> => {
        const projectMemoriesDir = join(process.cwd(), '.claude/memories');
        const userMemoriesDir = join(process.env.HOME || '', '.deepagents/code/memories');
        const projectSkillsDir = join(process.cwd(), '.claude/skills');
        const userSkillsDir = join(process.env.HOME || '', '.deepagents/code/skills');

        try {
            const memories = listMemories(userMemoriesDir, projectMemoriesDir);
            const skills = listSkills(userSkillsDir, projectSkillsDir);

            // 根据当前选中的标签过滤
            const filteredByTab =
                activeTab === 'memories'
                    ? memories.map((m) => ({ ...m, type: 'memory' as const }))
                    : skills.map((s) => ({ ...s, type: 'skill' as const }));

            return filteredByTab;
        } catch (error) {
            console.warn('Failed to load knowledge:', error);
            return [];
        }
    }, [activeTab]);

    // 修复：使用 useCallback 保持 renderItem 引用稳定
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

    // 修复：使用 useCallback 保持 onSelect 引用稳定
    const handleSelect = useCallback((item: KnowledgeItem) => {
        // 只读，不执行操作
        console.log('Selected knowledge item:', item.name);
    }, []);

    // 修复：使用 useMemo 缓存 filters 和 keyMap
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

    // 修复：使用 useMemo 缓存 panelConfig，依赖 activeTab 状态
    const panelConfig: PanelConfig<KnowledgeItem> = useMemo(
        () => ({
            id: 'knowledge',
            title: '知识库',
            icon: '📚',

            dataSource: loadKnowledge,

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
        [loadKnowledge, filters, renderItem, handleSelect, keyMap, activeTab],
    );

    return <UniversalPanel config={panelConfig} onClose={onClose} />;
};

export default KnowledgePanel;

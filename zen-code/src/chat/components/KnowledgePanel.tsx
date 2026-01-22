/**
 * Knowledge 面板 - 使用统一面板系统重构
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { join } from 'path';
import { UniversalPanel } from './Panel/UniversalPanel';
import { PanelConfig, PanelContext } from './Panel/types';
import { listMemories, type MemoryMetadata } from '@codegraph/agent/src/memories/load';
import { listSkills, type SkillMetadata } from '@codegraph/agent/src/skills/load';
import { cleanPath } from '../../utils/cleanPath';

interface KnowledgePanelProps {
    onClose: () => void;
}

type KnowledgeItem = (MemoryMetadata | SkillMetadata) & { type: 'memory' | 'skill' };

const KnowledgePanel: React.FC<KnowledgePanelProps> = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState<'memories' | 'skills'>('memories');

    const loadKnowledge = async (): Promise<KnowledgeItem[]> => {
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
    };

    // 获取记忆的类别过滤器
    const getMemoryFilters = async () => {
        const projectMemoriesDir = join(process.cwd(), '.claude/memories');
        const userMemoriesDir = join(process.env.HOME || '', '.deepagents/code/memories');

        try {
            const memories = listMemories(userMemoriesDir, projectMemoriesDir);
            const categories = Array.from(new Set(memories.map((m) => m.category))).sort();

            return categories.map((cat) => ({
                id: cat,
                label: cat,
                predicate: (item: any) => item.category === cat,
            }));
        } catch (error) {
            return [];
        }
    };

    const panelConfig: PanelConfig<KnowledgeItem> = {
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
        filters: [
            {
                id: 'memory',
                label: '记忆',
                predicate: (item) => item.type === 'memory',
            },
            {
                id: 'skill',
                label: '技能',
                predicate: (item) => item.type === 'skill',
            },
        ],
        defaultFilter: activeTab === 'memories' ? 'memory' : 'skill',

        // 渲染配置
        itemHeight: 8, // 每个 knowledge item 占 4 行
        visibleCount: 3,

        renderItem: (item: any, index, isSelected) => {
            const description = item.description.length > 80 ? item.description.slice(0, 80) + '...' : item.description;

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
        },

        showCount: true,

        onSelect: (item) => {
            // 只读，不执行操作
            console.log('Selected knowledge item:', item.name);
        },

        keyMap: {
            h: (context: PanelContext<KnowledgeItem>) => {
                setActiveTab('memories');
                context.setActiveFilter('memory');
            },
            s: (context: PanelContext<KnowledgeItem>) => {
                setActiveTab('skills');
                context.setActiveFilter('skill');
            },
        },
    };

    return <UniversalPanel config={panelConfig} onClose={onClose} />;
};

export default KnowledgePanel;

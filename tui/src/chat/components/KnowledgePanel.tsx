import React, { useEffect, useState } from 'react';
import { Box, Text, useInput, useFocus } from 'ink';
import { join } from 'path';
import { Tabs, TabItem } from './input/Tabs';
import { listMemories, type MemoryMetadata } from '../../../../agents/code/memories/load';
import { listSkills, type SkillMetadata } from '../../../../agents/code/skills/load';
import { cleanPath } from '../../utils/cleanPath';

interface KnowledgePanelProps {
    onClose: () => void;
}

const KnowledgePanel: React.FC<KnowledgePanelProps> = ({ onClose }) => {
    const { isFocused } = useFocus({ autoFocus: true });
    const [memories, setMemories] = useState<MemoryMetadata[]>([]);
    const [skills, setSkills] = useState<SkillMetadata[]>([]);
    const [activeTab, setActiveTab] = useState<'memories' | 'skills'>('memories');

    // Load memories on mount
    useEffect(() => {
        loadMemories();
    }, []);

    // Load skills on mount
    useEffect(() => {
        loadSkills();
    }, []);

    useInput((input, key) => {
        if (key.escape || input === 'q' || input === 'h') {
            onClose();
        }
    });

    const loadMemories = () => {
        const projectMemoriesDir = join(process.cwd(), '.claude/memories');
        const userMemoriesDir = join(process.env.HOME || '', '.deepagents/code/memories');

        try {
            const loadedMemories = listMemories(userMemoriesDir, projectMemoriesDir);
            // Sort by category
            loadedMemories.sort((a, b) => a.category.localeCompare(b.category));
            setMemories(loadedMemories);
        } catch (error) {
            console.warn('Failed to load memories:', error);
            setMemories([]);
        }
    };

    const loadSkills = () => {
        const projectSkillsDir = join(process.cwd(), '.claude/skills');
        const userSkillsDir = join(process.env.HOME || '', '.deepagents/code/skills');

        try {
            const loadedSkills = listSkills(userSkillsDir, projectSkillsDir);
            setSkills(loadedSkills);
        } catch (error) {
            console.warn('Failed to load skills:', error);
            setSkills([]);
        }
    };

    const renderMemoryList = () => {
        if (memories.length === 0) {
            return (
                <Box paddingX={1} paddingY={1}>
                    <Text color="gray">暂无记忆文件</Text>
                </Box>
            );
        }

        return memories.map((memory) => {
            const sourceIcon = memory.source === 'project' ? '📁' : '👤';
            const description =
                memory.description.length > 80 ? memory.description.slice(0, 80) + '...' : memory.description;

            return (
                <Box key={memory.path} flexDirection="column" paddingTop={1}>
                    <Box>
                        <Text bold color="gray">
                            {sourceIcon} {memory.name}
                        </Text>
                        <Text color="gray"> · </Text>
                        <Text color="yellow">{memory.category}</Text>
                    </Box>
                    <Box paddingLeft={2} paddingY={1}>
                        <Text>{description}</Text>
                    </Box>
                    <Box paddingLeft={2}>
                        <Text color="cyan" dimColor>
                            {cleanPath(memory.path)}
                        </Text>
                    </Box>
                    {memory.tags.length > 0 && (
                        <Box paddingLeft={2} gap={1}>
                            {memory.tags.map((tag, index) => (
                                <Text key={index} color="green">
                                    #{tag}
                                </Text>
                            ))}
                        </Box>
                    )}
                </Box>
            );
        });
    };

    const renderSkillList = () => {
        if (skills.length === 0) {
            return (
                <Box paddingX={1} paddingY={1}>
                    <Text color="gray">暂无技能文件</Text>
                </Box>
            );
        }

        return skills.map((skill) => {
            const sourceIcon = skill.source === 'project' ? '📁' : '👤';
            const description =
                skill.description.length > 80 ? skill.description.slice(0, 80) + '...' : skill.description;

            return (
                <Box key={skill.path} flexDirection="column" paddingY={1}>
                    <Box>
                        <Text bold color="white">
                            {sourceIcon} {skill.name}
                        </Text>
                    </Box>
                    <Box paddingLeft={2}>
                        <Text color="gray" dimColor>
                            {description}
                        </Text>
                    </Box>
                    <Box paddingLeft={2}>
                        <Text color="cyan" dimColor>
                            📄 {cleanPath(skill.path)}
                        </Text>
                    </Box>
                </Box>
            );
        });
    };

    const tabItems: TabItem[] = [
        {
            id: 'memories',
            label: `记忆 (${memories.length})`,
            content: <Box flexDirection="column">{renderMemoryList()}</Box>,
        },
        {
            id: 'skills',
            label: `技能 (${skills.length})`,
            content: <Box flexDirection="column">{renderSkillList()}</Box>,
        },
    ];

    return (
        <Box flexDirection="column" paddingX={1} paddingY={0} flexGrow={1}>
            <Box paddingBottom={0} justifyContent="space-between">
                <Text color="yellow" bold>
                    📚 知识库
                </Text>
                <Text color="gray">
                    <Text color="cyan" bold>
                        ←→
                    </Text>
                    :切换标签{' '}
                    <Text color="red" bold>
                        q
                    </Text>
                    :关闭
                </Text>
            </Box>

            <Tabs
                items={tabItems}
                defaultIndex={0}
                onChange={(index) => setActiveTab(index === 0 ? 'memories' : 'skills')}
                variant="line"
            />
        </Box>
    );
};

export default KnowledgePanel;

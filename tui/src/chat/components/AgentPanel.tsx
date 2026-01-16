import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useFocus } from 'ink';
import { useSettings } from '../context/SettingsContext';
import { loadAgentsList } from '../../../../agents/code/subagents/config.js';

interface AgentConfig {
    id: string;
    name: string;
    description: string;
}

interface AgentPanelProps {
    onClose: () => void;
}

const AgentPanel: React.FC<AgentPanelProps> = ({ onClose }) => {
    const { isFocused } = useFocus({ autoFocus: true });
    const { config, updateConfig } = useSettings();
    const [agents, setAgents] = useState<AgentConfig[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);

    // 当前 agent ID（直接从 config 读取）
    const currentAgentId = config?.switch_command || 'default';

    // 加载 agents
    useEffect(() => {
        loadAgentsList().then((configs) => {
            const agentList = Object.values(configs);
            setAgents(agentList);

            // 初始化时选中当前 agent
            const currentIndex = agentList.findIndex((a) => a.id === currentAgentId);
            if (currentIndex !== -1) {
                setSelectedIndex(currentIndex);
            }
        });
    }, [currentAgentId]); // 当 config.switch_command 变化时重新定位

    useInput((input, key) => {
        if (key.escape || input === 'q' || input === 'c') {
            onClose();
            return;
        }

        if (key.return) {
            // 切换到选中的 agent
            const selectedAgent = agents[selectedIndex];
            if (selectedAgent && selectedAgent.id !== currentAgentId) {
                handleAgentSwitch(selectedAgent.id);
            }
            return;
        }

        // 上下键选择
        if (key.upArrow) {
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : agents.length - 1));
        } else if (key.downArrow) {
            setSelectedIndex((prev) => (prev < agents.length - 1 ? prev + 1 : 0));
        }
    });

    const handleAgentSwitch = async (agentId: string) => {
        try {
            // 空字符串表示重置为默认
            const switchCommand = agentId === 'default' ? '' : agentId;
            await updateConfig({ switch_command: switchCommand });

            // 切换成功后自动关闭面板（config 更新后 currentAgentId 会自动变化）
            setTimeout(() => {
                onClose();
            }, 500);
        } catch (error) {
            console.error('Agent 切换失败:', error);
        }
    };

    if (agents.length === 0) {
        return (
            <Box paddingX={1} paddingY={1}>
                <Text color="red">加载中...</Text>
            </Box>
        );
    }

    const currentAgent = agents.find((a) => a.id === currentAgentId);

    const renderAgentList = () => {
        return agents.map((agent, index) => {
            const isSelected = index === selectedIndex;
            const isCurrent = agent.id === currentAgentId;

            // 图标
            let icon = '  ';
            if (isCurrent) icon = '✓ ';
            if (isSelected) icon = '▶ ';

            // 颜色
            let color = 'gray';
            if (isSelected) color = 'cyan';
            if (isCurrent) color = 'green';

            return (
                <Box key={agent.id} paddingX={1} paddingY={0}>
                    <Box width={14}>
                        <Text color={isSelected ? 'cyan' : 'gray'}>{icon}</Text>
                        <Text bold={isSelected} color={color}>
                            {agent.id}
                        </Text>
                    </Box>
                    <Box flexGrow={1}>
                        <Text color={isSelected ? 'white' : 'gray'} bold={isSelected}>
                            {agent.name}
                        </Text>
                        <Text color="gray" dimColor>
                            {' - '}
                            {agent.description}
                        </Text>
                    </Box>
                    {isCurrent && <Text color="green"> 当前</Text>}
                </Box>
            );
        });
    };

    return (
        <Box flexDirection="column" paddingX={1} paddingY={0} flexGrow={1}>
            <Box paddingBottom={1} justifyContent="space-between">
                <Text color="yellow" bold>
                    🤖 Agent 选择
                </Text>
                <Text color="gray">
                    <Text color="cyan" bold>
                        ↑↓
                    </Text>
                    :选择{' '}
                    <Text color="green" bold>
                        Enter
                    </Text>
                    :切换{' '}
                    <Text color="red" bold>
                        q
                    </Text>
                    :关闭
                </Text>
            </Box>

            <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
                {renderAgentList()}
            </Box>

            <Box marginTop={1} paddingX={1}>
                <Text color="gray" dimColor>
                    当前 Agent: <Text color="green">{currentAgent?.name || 'default'}</Text>
                </Text>
            </Box>
        </Box>
    );
};

export default AgentPanel;

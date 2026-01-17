/**
 * Agent 面板 - 使用统一面板系统重构
 */

import React from 'react';
import { Spacer, Text } from 'ink';
import { UniversalPanel } from './Panel/UniversalPanel';
import { SelectItem } from './Panel/SelectItem';
import { PanelConfig } from './Panel/types';
import { useSettings } from '../context/SettingsContext';
import { AgentConfig, loadAgentsList } from '../../../../agents/code/subagents/config.js';

interface AgentPanelProps {
    onClose: () => void;
}

const AgentPanel: React.FC<AgentPanelProps> = ({ onClose }) => {
    const { config, updateConfig } = useSettings();
    const currentAgentId = config?.switch_command || 'default';

    const panelConfig: PanelConfig = {
        id: 'agent',
        title: 'Agent 选择',
        icon: '🤖',

        // 数据源
        dataSource: async () => {
            const configs = await loadAgentsList();
            return Object.values(configs);
        },

        // 搜索配置
        searchable: true,
        searchFields: ['id', 'name', 'description'],
        searchPlaceholder: '搜索 agent (名称/描述)...',

        // 过滤配置
        filterable: true,
        filters: [
            {
                id: 'default',
                label: '默认',
                predicate: (agent: AgentConfig) => agent.id === 'default',
            },
            {
                id: 'custom',
                label: '自定义',
                predicate: (agent: AgentConfig) => agent.id !== 'default',
            },
        ],
        defaultFilter: 'all',

        // 渲染配置
        itemHeight: 3, // 每个 agent 占 3 行
        visibleCount: 15, // 显示 15 个 agent

        renderItem: (agent: AgentConfig, index, isSelected) => {
            const isCurrent = agent.id === currentAgentId;
            return (
                <SelectItem key={agent.id} isSelected={isSelected} isCurrent={isCurrent}>
                    <Text bold>{agent.id}</Text>
                    <Spacer></Spacer>
                    <Text dimColor>{agent.description}</Text>
                </SelectItem>
            );
        },

        isSelected: (agent: AgentConfig) => agent.id === currentAgentId,

        onSelect: async (agent: AgentConfig) => {
            const switchCommand = agent.id === 'default' ? '' : agent.id;
            updateConfig({ switch_command: switchCommand });
            onClose();
        },

        showCount: true,

        statusInfo: (items) => {
            const current = items.find((a: any) => a.id === currentAgentId);
            return current ? (
                <Text color="gray" dimColor>
                    当前 Agent: <Text color="green">{current.name}</Text>
                </Text>
            ) : null;
        },
    };

    return <UniversalPanel config={panelConfig} onClose={onClose} />;
};

export default AgentPanel;

/**
 * Agent 面板 - 使用统一面板系统重构
 */

import React, { useCallback, useMemo } from 'react';
import { Spacer, Text } from 'ink';
import { UniversalPanel } from 'ink-pro';
import { SelectItem } from 'ink-pro';
import { PanelConfig } from 'ink-pro';
import { useSettings } from '../context/SettingsContext';
import { FEAgentConfig, loadAgentsList } from '@codegraph/agent/src/subagents/config.js';
import { agentPackage } from '@codegraph/agent/src/config';

interface AgentPanelProps {
    onClose: () => void;
}

const AgentPanel: React.FC<AgentPanelProps> = ({ onClose }) => {
    const { config, updateConfig } = useSettings();
    const currentAgentId = config?.switch_command || 'default';

    // 修复：使用 useCallback 保持 dataSource 引用稳定
    const dataSource = useCallback(async () => {
        const configs = await loadAgentsList(agentPackage);
        return Object.values(configs);
    }, []);

    // 修复：使用 useCallback 保持 renderItem 引用稳定
    const renderItem = useCallback(
        (agent: FEAgentConfig, index: number, isSelected: boolean) => {
            const isCurrent = agent.id === currentAgentId;
            return (
                <SelectItem key={agent.id} isSelected={isSelected} isCurrent={isCurrent}>
                    <Text bold>
                        {index + 1}. {agent.id}
                    </Text>
                    <Spacer></Spacer>
                    <Text dimColor>{agent.description}</Text>
                </SelectItem>
            );
        },
        [currentAgentId],
    );

    // 修复：使用 useCallback 保持 isSelected 引用稳定
    const isSelected = useCallback(
        (agent: FEAgentConfig) => {
            return agent.id === currentAgentId;
        },
        [currentAgentId],
    );

    // 修复：使用 useCallback 保持 onSelect 引用稳定
    const handleSelect = useCallback(
        async (agent: FEAgentConfig) => {
            const switchCommand = agent.id === 'default' ? '' : agent.id;
            updateConfig({ switch_command: switchCommand });
            onClose();
        },
        [updateConfig, onClose],
    );

    // 修复：使用 useCallback 保持 statusInfo 引用稳定
    const statusInfo = useCallback(
        (items: any[]) => {
            const current = items.find((a: any) => a.id === currentAgentId);
            return current ? (
                <Text color="gray" dimColor>
                    当前 Agent: <Text color="green">{current.name}</Text>
                </Text>
            ) : null;
        },
        [currentAgentId],
    );

    // 修复：使用 useMemo 缓存 panelConfig
    const panelConfig: PanelConfig = useMemo(
        () => ({
            id: 'agent',
            title: 'Agent 选择',
            icon: '🤖',

            // 数据源
            dataSource: dataSource,

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
                    predicate: (agent: FEAgentConfig) => agent.id === 'default',
                },
                {
                    id: 'custom',
                    label: '自定义',
                    predicate: (agent: FEAgentConfig) => agent.id !== 'default',
                },
            ],
            defaultFilter: 'all',

            // 渲染配置
            itemHeight: 3, // 每个 agent 占 3 行
            visibleCount: 15, // 显示 15 个 agent

            renderItem: renderItem,

            isSelected: isSelected,

            onSelect: handleSelect,

            showCount: true,

            statusInfo: statusInfo,
        }),
        [dataSource, renderItem, isSelected, handleSelect, statusInfo],
    );

    return <UniversalPanel config={panelConfig} onClose={onClose} />;
};

export default AgentPanel;

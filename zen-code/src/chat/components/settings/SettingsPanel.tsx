/**
 * Settings Panel 主组件
 */

import React, { useState, useCallback } from 'react';
import { Box, Text } from 'ink';
import { useInput } from 'ink-pro';
import { useSettings } from '../../context/SettingsContext';
import type { SettingsPanelProps } from './types';
import SettingsForm from './SettingsForm';
import { SETTINGS_SCHEMA, SETTINGS_TABS } from './schema';

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
    const { config, updateConfig } = useSettings();
    const [activeTab, setActiveTab] = useState('General');
    const hasMultipleTabs = SETTINGS_TABS.length > 1;

    const handleUpdate = useCallback(
        async (key: string, value: any) => {
            await updateConfig({ [key]: value });
        },
        [updateConfig],
    );

    const cycleTab = useCallback(
        (dir: 1 | -1) => {
            if (!hasMultipleTabs) return;
            const idx = SETTINGS_TABS.findIndex((t) => t.id === activeTab);
            const next = (idx + dir + SETTINGS_TABS.length) % SETTINGS_TABS.length;
            setActiveTab(SETTINGS_TABS[next].id);
        },
        [activeTab, hasMultipleTabs],
    );

    useInput(
        (input, key) => {
            if (key.escape) onClose();
            else if (key.leftArrow && key.alt) cycleTab(-1);
            else if (key.rightArrow && key.alt) cycleTab(1);
        },
        { isActive: config !== null },
    );

    if (!config) {
        return (
            <Box padding={2}>
                <Text>Loading...</Text>
            </Box>
        );
    }

    return (
        <Box flexDirection="column" width="100%" borderStyle="single" borderColor="gray">
            <Box paddingX={2} borderBottom borderColor="gray">
                <Text bold color="cyan">
                    ⚙ Settings
                </Text>
            </Box>

            {hasMultipleTabs && (
                <Box flexDirection="row" gap={2} paddingX={2} borderBottom borderColor="gray">
                    {SETTINGS_TABS.map((tab) => (
                        <Text key={tab.id} bold={activeTab === tab.id} color={activeTab === tab.id ? 'cyan' : 'gray'}>
                            {tab.icon} {tab.label}
                        </Text>
                    ))}
                </Box>
            )}

            <SettingsForm schema={SETTINGS_SCHEMA} config={config} onUpdate={handleUpdate} activeTab={activeTab} />

            <Box paddingX={2} borderTop borderColor="gray">
                <Text dimColor>Esc: Close | Auto-save | Global: Ctrl+O (Compact)</Text>
            </Box>
        </Box>
    );
};

export default SettingsPanel;

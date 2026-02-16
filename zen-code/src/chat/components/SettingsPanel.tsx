/**
 * Settings 面板 - 聚合 Model 和 Provider 配置
 * 使用 Tab 系统切换不同的配置视图
 */

import React, { useState, useCallback } from 'react';
import { Box, Text, Spacer } from 'ink';
import { useInput } from 'ink-pro';
import ModelPanel from './ModelPanel';
import ProviderPanel from './ProviderPanel';

type SettingsTab = 'model' | 'provider';

interface SettingsPanelProps {
    onClose: () => void;
    // 可选：指定初始 tab
    initialTab?: SettingsTab;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose, initialTab = 'model' }) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

    // 快捷键处理
    useInput(
        (input, key) => {
            // Alt+左箭头 切换到前一个 tab (provider -> model)
            if (key.leftArrow && key.alt) {
                setActiveTab('model');
            }
            // Alt+右箭头 切换到后一个 tab (model -> provider)
            else if (key.rightArrow && key.alt) {
                setActiveTab('provider');
            } else if (key.escape) {
                onClose();
            }
        },
        { isActive: true },
    );

    return (
        <Box flexDirection="column" width="100%" borderStyle="single" borderDimColor>
            {/* 内容区域 */}
            <Box flexDirection="column" paddingX={0} paddingY={0}>
                {activeTab === 'model' && <ModelPanel onClose={onClose} />}
                {activeTab === 'provider' && <ProviderPanel onClose={onClose} />}
            </Box>
            {/* Tab 头 */}
            <Box
                flexDirection="row"
                gap={2}
                paddingX={2}
                paddingY={1}
                borderTop={true}
                borderBottom={false}
                borderLeft={false}
                borderRight={false}
                borderStyle="single"
                borderColor="gray"
            >
                <Text bold={activeTab === 'model'} color={activeTab === 'model' ? 'cyan' : 'gray'}>
                    🤖 Model
                </Text>
                <Text bold={activeTab === 'provider'} color={activeTab === 'provider' ? 'cyan' : 'gray'}>
                    🔌 Provider
                </Text>
                <Spacer></Spacer>
            </Box>
        </Box>
    );
};

export default SettingsPanel;

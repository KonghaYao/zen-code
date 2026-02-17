/**
 * Settings 面板 - 通用设置
 *
 * JSON Schema 驱动的配置面板
 * 用于配置 compact_mode, enable_thinking, stream_refresh_interval 等
 *
 * 注意：
 * - MCP 配置 → /mcp 命令
 * - Provider 配置 → /provider 命令
 * - Model 配置 → ModelProviderPanel
 */

import React from 'react';
import { SettingsPanel as SettingsPanelImpl } from './settings';

interface SettingsPanelProps {
    onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
    return <SettingsPanelImpl onClose={onClose} />;
};

export default SettingsPanel;

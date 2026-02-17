/**
 * Settings Schema 定义
 *
 * 定义所有可配置的字段，面板根据此 Schema 自动渲染
 */

import type { SettingField, SettingTab } from './types';

/**
 * Settings Schema
 */
export const SETTINGS_SCHEMA: SettingField[] = [
    {
        key: 'compact_mode',
        label: '紧凑模式',
        type: 'toggle',
        group: '显示',
        tab: 'General',
        help: '紧凑显示消息',
    },
    {
        key: 'enable_thinking',
        label: '思考模式',
        type: 'toggle',
        group: '模型',
        tab: 'General',
        help: '启用模型思考',
    },
    {
        key: 'stream_refresh_interval',
        label: '流刷新间隔',
        type: 'number',
        group: '模型',
        tab: 'General',
        min: 50,
        max: 1000,
        step: 50,
        help: '流刷新间隔 (ms)',
    },
];

export const SETTINGS_TABS: SettingTab[] = (() => {
    const tabSet = new Map<string, SettingTab>();
    SETTINGS_SCHEMA.forEach((field) => {
        const tabId = field.tab || 'General';
        if (!tabSet.has(tabId)) {
            tabSet.set(tabId, {
                id: tabId,
                label: tabId,
                icon: '⚙',
            });
        }
    });
    return Array.from(tabSet.values());
})();

export const SETTINGS_GROUPS = (() => {
    const groupMap = new Map<string, { id: string; label: string; fields: SettingField[] }>();
    SETTINGS_SCHEMA.forEach((field) => {
        if (!groupMap.has(field.group)) {
            groupMap.set(field.group, {
                id: field.group,
                label: field.group,
                fields: [],
            });
        }
        groupMap.get(field.group)!.fields.push(field);
    });
    return Array.from(groupMap.values());
})();

export function getFieldsByTab(tab: string): SettingField[] {
    return SETTINGS_SCHEMA.filter((field) => (field.tab || 'General') === tab);
}

export function getGroupsByTab(tab: string): typeof SETTINGS_GROUPS {
    const fields = getFieldsByTab(tab);
    const groupMap = new Map<string, { id: string; label: string; fields: SettingField[] }>();
    fields.forEach((field) => {
        if (!groupMap.has(field.group)) {
            groupMap.set(field.group, {
                id: field.group,
                label: field.group,
                fields: [],
            });
        }
        groupMap.get(field.group)!.fields.push(field);
    });
    return Array.from(groupMap.values());
}

/**
 * Settings Panel 类型定义
 *
 * JSON Schema 驱动的配置系统
 */

import type { AppConfig } from '@codegraph/config';

/**
 * 配置字段类型
 */
export type SettingFieldType = 'toggle' | 'select' | 'input' | 'number';

/**
 * 配置字段定义
 */
export interface SettingField {
    /** 配置字段名 (AppConfig 的 key) */
    key: keyof AppConfig;
    /** 显示标签 */
    label: string;
    /** 字段类型 */
    type: SettingFieldType;
    /** 帮助文本 */
    help?: string;
    /** 分组名 */
    group: string;
    /** Tab 名（默认 'General'） */
    tab?: string;

    // type-specific options
    /** 下拉选项 (for select) */
    options?: Array<{ label: string; value: any }>;
    /** 最小值 (for number) */
    min?: number;
    /** 最大值 (for number) */
    max?: number;
    /** 步长 (for number) */
    step?: number;
    /** 占位符 (for input) */
    placeholder?: string;
}

/**
 * Tab 定义
 */
export interface SettingTab {
    id: string;
    label: string;
    icon?: string;
}

/**
 * 分组定义
 */
export interface SettingGroup {
    id: string;
    label: string;
    fields: SettingField[];
}

/**
 * Settings Panel Props
 */
export interface SettingsPanelProps {
    onClose: () => void;
}

/**
 * Settings Form Props
 */
export interface SettingsFormProps {
    schema: SettingField[];
    config: AppConfig;
    onUpdate: (key: keyof AppConfig, value: any) => void;
    activeTab?: string;
}

/**
 * Setting Field Props
 */
export interface SettingFieldProps {
    field: SettingField;
    value: any;
    onChange: (value: any) => void;
    isFocused: boolean;
}

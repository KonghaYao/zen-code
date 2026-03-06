# Settings Panel 设计文档

> **状态**: ✅ 已实现（2026-03-06 验证 - `zen-code/src/chat/components/panels/settings/SettingsPanel.tsx` 已实现）

## 概述

Settings 面板是一个统一的配置界面，采用 **JSON Schema 驱动**
的方式渲染表单。MCP 和 Model 配置在专门的面板处理，Settings 面板负责其他通用配置项。

## 设计原则

1. **JSON 配置驱动**: 所有配置项通过 JSON Schema 定义，面板自动渲染
2. **可扩展性**: 支持 Tab 切换，为未来配置项增长预留空间
3. **简洁布局**: 单行显示配置项，聚焦时显示帮助
4. **统一交互**: 所有字段统一使用 `←→` 修改

## 需求总结

### 功能范围

**Settings 面板包含的配置项（基于 AppConfig）：**

| 配置项     | 字段                      | 类型    | 说明            |
| ---------- | ------------------------- | ------- | --------------- |
| 紧凑模式   | `compact_mode`            | boolean | 紧凑显示消息    |
| 思考模式   | `enable_thinking`         | boolean | 启用模型思考    |
| 流刷新间隔 | `stream_refresh_interval` | number  | 流刷新间隔 (ms) |

**不在 Settings 面板（有专门面板）：**

- Provider 配置 → Provider Panel (`/provider` 命令)
- MCP 配置 → MCP Panel (`/mcp` 命令)

### 交互设计

| 特性     | 决策                   |
| -------- | ---------------------- |
| 布局方式 | 单列表单，分组展示     |
| Tab 切换 | 支持（为未来扩展预留） |
| 触发入口 | `/settings` 命令       |
| 保存方式 | 实时保存（修改即生效） |
| 重置功能 | 暂不需要               |
| 帮助提示 | 聚焦时显示，中文       |
| 修改操作 | 统一 `←→` 键           |

### 输入控件类型

- **Toggle (开关)**: 布尔值配置，`←→` 切换
- **Number (数字输入)**: 数值配置，`←` 减少 `→` 增加
- **Select (下拉选择)**: 枚举值配置，`←→` 循环切换

## UI 设计

### 最终面板结构

```
┌─────────────────────────────────────────────┐
│ ⚙ Settings                                  │
├─────────────────────────────────────────────┤
│ [显示]                                      │
│ 紧凑模式: ON                                │
│                                             │
│ [模型]                                      │
│ 思考模式: OFF                               │
│   → 启用模型思考                            │
│ 流刷新间隔: 100 ms                          │
│                                             │
│ ↑↓ 导航 | ←→ 修改                           │
├─────────────────────────────────────────────┤
│ Esc 关闭 | 自动保存                         │
└─────────────────────────────────────────────┘
```

## 技术方案

### 文件结构

```
zen-code/src/chat/components/
├── SettingsPanel.tsx          # 面板入口（包装 settings/）
└── settings/
    ├── index.ts               # 导出
    ├── types.ts               # 类型定义
    ├── schema.ts              # JSON Schema（配置项定义）
    ├── SettingField.tsx       # 字段组件
    ├── SettingsForm.tsx       # 表单组件
    └── SettingsPanel.tsx      # 面板主组件
```

### Schema 定义

```typescript
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
```

### 数据流

```
SETTINGS_SCHEMA (JSON)
       ↓
SettingsPanel (渲染表单)
       ↓
User Input (←→ 修改)
       ↓
useUpdateConfig (TanStack Query)
       ↓
FileSystemConfigStore (LowDB)
       ↓
~/.zen-code/settings.json
```

### 命令注册

```typescript
// zen-code/src/chat/commands/settingsCommand.ts
export const settingsCommand: CommandDefinition = {
    name: 'settings',
    description: '打开通用设置面板',
    aliases: ['config', 'set'],
    usage: '/settings',
    execute: async (args, context) => {
        context.switchToSettings?.();
        return { success: true, shouldClearInput: true };
    },
};
```

## 实现状态

✅ 已完成

### 已实现功能

- [x] 类型定义 (`types.ts`)
- [x] JSON Schema 定义 (`schema.ts`)
- [x] SettingField 组件 (Toggle/Number/Select)
- [x] SettingsForm 组件 (分组渲染 + 键盘导航)
- [x] SettingsPanel 主组件
- [x] `/settings` 命令注册
- [x] 中文标签和帮助文本
- [x] 统一 `←→` 修改交互

## 与现有面板的关系

| 面板          | 命令        | 职责                          |
| ------------- | ----------- | ----------------------------- |
| ProviderPanel | `/provider` | Model/Provider 配置           |
| MCP Panel     | `/mcp`      | MCP 服务器配置                |
| SettingsPanel | `/settings` | 通用配置 (紧凑、思考、流间隔) |

## 扩展指南

### 添加新配置项

1. 在 `schema.ts` 中添加新的 SettingField
2. 确保 AppConfig 类型包含该字段
3. 面板自动渲染新字段

```typescript
{
  key: 'new_option',
  label: '新选项',
  type: 'toggle',
  group: '显示',
  tab: 'General',
  help: '这是一个新选项',
}
```

### 添加新 Tab

当配置项增多时，在字段中设置 `tab` 属性：

```typescript
{
  key: 'advanced_option',
  label: '高级选项',
  type: 'toggle',
  group: '高级',
  tab: 'Advanced',
  help: '高级配置',
}
```

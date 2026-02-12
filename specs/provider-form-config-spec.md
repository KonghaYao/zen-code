# Provider 配置表单系统 Spec

## 1. 概述

本文档定义了 Provider 配置表单系统的设计规范，用于让用户通过 TUI 界面交互式配置 AI Provider。

### 1.1 背景

当前 Provider 配置需要手动编辑 `~/.zen-code/settings.json` 文件，对用户不友好。需要提供一个可视化的界面来简化配置流程。

### 1.2 目标

- 提供交互式 TUI 界面管理 Provider（列表 + 表单）
- 支持新增、编辑、删除、设为默认 Provider
- 支持表单字段验证
- 复用现有 TUI 组件
- 与现有配置系统无缝集成

## 2. 现有基础设施（复用）

### 2.1 已存在的配置系统

| 组件/文件               | 状态      | 说明                                 |
| ----------------------- | --------- | ------------------------------------ |
| `ProviderConfig` 类型   | ✅ 已实现 | `packages/config/src/types/index.ts` |
| `FileSystemConfigStore` | ✅ 已实现 | 配置存储层                           |
| `AppConfig.providers`   | ✅ 已实现 | 配置数组结构                         |
| 配置迁移逻辑            | ✅ 已实现 | `migrateLegacyConfig()`              |
| 环境变量同步            | ✅ 已实现 | `syncEnvFromConfig()`                |

### 2.2 可复用的 TUI 组件

| 组件                 | 路径                                          | 用途                          |
| -------------------- | --------------------------------------------- | ----------------------------- |
| `UniversalPanel`     | `packages/ink-pro/src/components/Panel/`      | 列表展示（Provider 列表）     |
| `MultiLineTextInput` | `packages/ink-pro/src/components/Input/`      | 单行/多行文本输入（表单字段） |
| `Tabs`               | `zen-code/src/chat/components/input/Tabs.tsx` | Tab 切换（列表/表单模式）     |
| `SelectItem`         | `packages/ink-pro/src/components/Input/`      | 列表项渲染                    |
| `PanelContainer`     | `packages/ink-pro/src/components/Panel/`      | 面板容器                      |

## 3. UI 设计

### 3.1 两视图架构

使用 `Tabs` 组件实现两个视图：

1. **列表视图** - 显示所有已配置的 Providers
2. **表单视图** - 新增/编辑 Provider

### 3.2 布局结构

```
┌─────────────────────────────────────────────────────┐
│ Provider 配置                          [ESC] 关闭   │
├─────────────────────────────────────────────────────┤
│  [列表视图] [新增 Provider]                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  已配置的 Providers:                                 │
│                                                     │
│  [★] openai (OpenAI)             [API Key: 已配置] │
│      anthropic (Anthropic)        [API Key: 未配置] │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ [Enter] 选择   [n] 新增   [e] 编辑   [d] 删除  │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 3.3 表单视图布局

```
┌─────────────────────────────────────────────────────┐
│ 新增 Provider                                        │
├─────────────────────────────────────────────────────┤
│  Provider ID: [custom-openai            ]          │
│    └─ Provider 的唯一标识符                           │
│                                                     │
│  Provider Type: [OpenAI ▼] ←→ 切换类型              │
│                                                     │
│  Provider Name: [My OpenAI Provider      ]        │
│    └─ Provider 显示名称                             │
│                                                     │
│  API Key: [sk-xxxxxxxxxxxxxxx         ]           │
│    └─ 您的 API 密钥                                 │
│                                                     │
│  Base URL: [https://api.openai.com/v1]            │
│    └─ API 基础地址                                  │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ [Enter] 保存   [Esc] 取消                  │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  错误提示: Provider ID 已存在                      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 3.4 快捷键

| 快捷键 | 功能                           |
| ------ | ------------------------------ |
| ESC    | 关闭面板 / 取消编辑            |
| Enter  | 选择 Provider / 保存配置       |
| n      | 新增 Provider                  |
| e      | 编辑选中的 Provider            |
| d      | 删除选中的 Provider（需确认）  |
| s      | 设为当前默认 Provider          |
| ←→     | 切换 Provider 类型（表单视图） |
| ↑↓     | 导航列表                       |

## 4. 表单字段定义

| 字段    | 类型   | 必填 | 描述                | 验证规则                         |
| ------- | ------ | ---- | ------------------- | -------------------------------- |
| id      | string | 是   | Provider 唯一标识符 | 3-32字符、字母数字下划线、唯一性 |
| type    | select | 是   | Provider 类型       | openai / anthropic               |
| name    | string | 是   | Provider 显示名称   | 2-50字符、非空                   |
| apiKey  | string | 是   | API 密钥            | 非空                             |
| baseUrl | string | 是   | API 基础 URL        | URL 格式校验                     |

## 5. 组件结构

### 5.1 文件结构

```
zen-code/src/chat/components/
├── ProviderPanel.tsx           # 主面板组件（Tab 切换列表/表单）
└── forms/
    └── ProviderForm.tsx        # Provider 表单组件（新增/编辑）
```

### 5.2 ProviderPanel 组件

```typescript
interface ProviderPanelProps {
    onClose: () => void;
}

// 使用 Tabs 实现两个视图
const tabs = [
    {
        id: 'list',
        label: 'Provider 列表',
        content: <ProviderList />
    },
    {
        id: 'form',
        label: '新增 Provider',
        content: <ProviderForm mode="add" />
    }
];
```

### 5.3 ProviderList 组件

使用 `UniversalPanel` 实现列表展示：

```typescript
const panelConfig: PanelConfig<ProviderConfig> = {
    id: 'provider-list',
    title: 'Provider 列表',
    icon: '🔌',

    dataSource: () => config?.providers || [],

    renderItem: (provider, index, isSelected) => {
        const isCurrent = provider.id === config?.provider_id;
        const hasApiKey = !!provider.apiKey;

        return (
            <SelectItem key={provider.id} isSelected={isSelected} isCurrent={isCurrent}>
                <Text>{isCurrent ? '★' : ' '} {provider.id}</Text>
                <Text dimColor> ({provider.name})</Text>
                <Text color={hasApiKey ? 'green' : 'yellow'}>
                    [{hasApiKey ? '已配置' : '未配置'}]
                </Text>
            </SelectItem>
        );
    },

    onSelect: (provider) => {
        // 设为默认 Provider
        updateConfig({
            provider_id: provider.id,
            provider_type: provider.type,
        });
        onClose();
    },

    keyMap: {
        'n': () => { /* 切换到表单 Tab */ },
        'e': (context) => { /* 切换到表单 Tab，编辑模式 */ },
        'd': (context) => { /* 删除 Provider */ },
    },
};
```

### 5.4 ProviderForm 组件

使用 `MultiLineTextInput` 实现表单输入：

```typescript
const ProviderForm: React.FC<{ mode: 'add' | 'edit', provider?: ProviderConfig }> = ({
    mode,
    provider
}) => {
    const [formData, setFormData] = useState({
        id: provider?.id || '',
        type: provider?.type || 'openai',
        name: provider?.name || '',
        apiKey: provider?.apiKey || '',
        baseUrl: provider?.baseUrl || '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    return (
        <Box flexDirection="column" paddingX={2}>
            <FormField label="Provider ID">
                <MultiLineTextInput
                    value={formData.id}
                    onChange={(v) => setFormData({ ...formData, id: v })}
                    placeholder="my-provider"
                    maxVisibleLines={1}
                />
            </FormField>

            {/* 其他字段... */}
        </Box>
    );
};
```

## 6. 验证逻辑

```typescript
function validateProvider(provider: Partial<ProviderConfig>, existingProviders: ProviderConfig[]): ValidationResult {
    const errors: Record<string, string> = {};

    // ID 验证
    if (!provider.id || provider.id.length < 3 || provider.id.length > 32) {
        errors.id = 'ID 必须为 3-32 个字符';
    } else if (!/^[a-zA-Z0-9_]+$/.test(provider.id)) {
        errors.id = 'ID 只能包含字母、数字和下划线';
    } else if (existingProviders.some((p) => p.id === provider.id)) {
        errors.id = 'ID 已存在';
    }

    // Name 验证
    if (!provider.name || provider.name.length < 2 || provider.name.length > 50) {
        errors.name = '名称必须为 2-50 个字符';
    }

    // API Key 验证
    if (!provider.apiKey) {
        errors.apiKey = 'API Key 不能为空';
    }

    // Base URL 验证
    if (!provider.baseUrl) {
        errors.baseUrl = 'Base URL 不能为空';
    } else if (!provider.baseUrl.startsWith('https://')) {
        errors.baseUrl = 'Base URL 必须以 https:// 开头';
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors,
    };
}
```

## 7. 数据流

```
ProviderPanel
    ↓ useSettings → config
ConfigManager
    ↓ updateConfig()
FileSystemConfigStore
    ↓ LowDB
~/.zen-code/settings.json
```

## 8. 与现有系统集成

### 8.1 ModelPanel 集成

ModelPanel 已自动读取 `config.providers`，新增 Provider 后会自动出现在 ModelPanel 的 Tab 中。

### 8.2 命令系统集成

添加 `/provider` 命令打开 ProviderPanel：

```typescript
// zen-code/src/chat/commands/providerCommand.ts
export const providerCommand: CommandDefinition = {
    name: 'provider',
    description: '配置 AI Provider',
    pattern: /\/provider/,
    handler: async (context) => {
        context.setPanel('provider');
    },
};
```

## 9. 实施步骤

### Phase 1: 列表视图

- [ ] 创建 ProviderPanel 组件（Tab 结构）
- [ ] 实现 ProviderList（基于 UniversalPanel）
- [ ] 实现 Provider 列表展示
- [ ] 实现 setAsDefault 功能

### Phase 2: 表单视图

- [ ] 实现 ProviderForm 组件
- [ ] 使用 MultiLineTextInput 实现表单字段
- [ ] 实现表单验证逻辑
- [ ] 实现新增 Provider 功能

### Phase 3: 编辑和删除

- [ ] 实现编辑 Provider 功能（复用 ProviderForm）
- [ ] 实现删除 Provider 功能
- [ ] 添加删除确认对话框

### Phase 4: 集成和优化

- [ ] 集成到 TUI 面板系统
- [ ] 添加命令系统集成
- [ ] 优化错误提示和用户反馈

## 10. 测试清单

| 测试场景                | 预期结果              |
| ----------------------- | --------------------- |
| 新增 OpenAI Provider    | 成功保存到配置文件    |
| 新增 Anthropic Provider | 成功保存到配置文件    |
| 修改现有 Provider       | 配置更新成功          |
| 删除 Provider           | 配置中移除该 Provider |
| 设为默认 Provider       | provider_id 更新      |
| ID 格式错误             | 显示错误提示          |
| ID 重复                 | 显示 ID 已存在错误    |
| API Key 为空            | 显示错误提示          |
| Base URL 格式错误       | 显示错误提示          |

## 11. 扩展性考虑

### 11.1 未来扩展

- 支持自定义 Provider 类型（通过插件）
- 支持从 URL 导入配置
- 支持配置备份和恢复

### 11.2 类型扩展

```typescript
// 未来可能支持的扩展字段
interface ExtendedProviderConfig extends ProviderConfig {
    customSettings?: Record<string, any>;
    tags?: string[];
    createdAt?: string;
    lastUsed?: string;
}
```

## 12. 相关文件

- 类型定义: `packages/config/src/types/index.ts`
- 配置存储: `packages/config/src/implementations/FileSystemConfigStore.ts`
- TUI 组件库: `packages/ink-pro/src/components/`
- ModelPanel 参考: `zen-code/src/chat/components/ModelPanel.tsx`
- AgentPanel 参考: `zen-code/src/chat/components/AgentPanel.tsx`
- 多 Provider 配置记忆: `.claude/memories/multi-provider-config-refactoring/`

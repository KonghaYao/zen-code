# ModelPanel Error Fallback Input

## Overview

当 zen-code 的 Model 面板遇到接口错误或模型列表为空时，显示一个文本输入框允许用户手动输入模型名称，默认值使用当前配置的模型名称。

**Status**: ✅ Implemented（2026-03-06 验证）

**已实现差异**：`ModelFallbackInput` 还额外支持 `onSwitchProvider` prop 用于 Tab/箭头键切换 provider，超出原规格设计。

## User Requirements

### 1. 触发条件

当以下任一情况发生时，用 输入框 **替换整个模型列表区域**：

| 条件         | 描述                                        |
| ------------ | ------------------------------------------- |
| 接口请求失败 | 网络错误、服务不可用等导致 `error !== null` |
| 接口请求超时 | 30秒超时后触发（含 timeout 类型错误）       |
| 模型列表为空 | 接口成功但返回空数组 `models.length === 0`  |

**不需要显示错误提示文字**，直接展示输入框。

### 2. 输入框交互

- **默认值**：从 `config.model_id` 读取当前模型名称（通过 `useSettings` 的 `config` 获取）
- **确认方式**：按 `Enter` 键确认
- **组件**：使用 `ink-pro` 中已有的 `MultiLineTextInput` 组件

### 3. 确认后行为

1. 调用 `updateConfig({ model_id: inputValue })` 保存模型名称到 config
2. 调用 `onClose()` 关闭面板

## Technical Specification

### 变更文件

**唯一变更文件**: `zen-code/src/chat/components/panels/ModelPanel.tsx`

### 当前代码（待修改）

```tsx
// 当前：error 分支只显示错误文字
} : error ? (
    <Box paddingX={2} paddingY={1}>
        <Text color="red">加载失败: {error.message}</Text>
    </Box>
) : !hasApiKey ? (
    // ...
) : (
    <UniversalPanel config={panelConfig} onClose={onClose} />
```

### 目标实现

#### 新增内联组件 `ModelFallbackInput`

```tsx
/**
 * 模型名称手动输入框 - 在接口错误或列表为空时显示
 */
const ModelFallbackInput: React.FC<{
    defaultValue: string;
    onSubmit: (modelId: string) => void;
}> = ({ defaultValue, onSubmit }) => {
    const [value, setValue] = useState(defaultValue);

    return (
        <Box paddingX={2} paddingY={1} flexDirection="column" gap={1}>
            <Text color="gray">请输入模型名称（Enter 确认）：</Text>
            <MultiLineTextInput value={value} onChange={setValue} onSubmit={onSubmit} maxVisibleLines={1} />
        </Box>
    );
};
```

#### 修改渲染逻辑

```tsx
// 判断是否需要显示 fallback 输入框
const showFallbackInput = !isLoading && hasApiKey && (!!error || models.length === 0);

// handleManualModel - 处理手动输入的模型名称
const handleManualModel = useCallback(
    async (modelId: string) => {
        if (!modelId.trim()) return;
        await updateConfig({ model_id: modelId.trim() });
        onClose();
    },
    [updateConfig, onClose],
);

// 渲染时
{
    isLoading ? (
        <Box paddingX={2} paddingY={1}>
            <Text color="gray">加载模型列表中...</Text>
        </Box>
    ) : !hasApiKey ? (
        <Box paddingX={2} paddingY={1}>
            <Text color="yellow">请先配置 API Key</Text>
        </Box>
    ) : showFallbackInput ? (
        <ModelFallbackInput defaultValue={config?.model_id || ''} onSubmit={handleManualModel} />
    ) : (
        <UniversalPanel config={panelConfig} onClose={onClose} />
    );
}
```

### 状态判断逻辑

```
isLoading = true  →  显示加载中
!hasApiKey        →  显示 "请先配置 API Key"
error !== null    →  显示 ModelFallbackInput（含 defaultValue）
models.length = 0 →  显示 ModelFallbackInput（含 defaultValue）
正常情况          →  显示 UniversalPanel
```

### 默认值来源

```typescript
// 从 useSettings 的 config 对象中读取
const { config, updateConfig } = useSettings();
const defaultModelId = config?.model_id || '';
```

## File Structure

变更仅涉及单个文件：

```
zen-code/src/chat/components/panels/
└── ModelPanel.tsx    # ← 唯一需要修改的文件
```

需要新增的 import：

```typescript
import { MultiLineTextInput } from 'ink-pro';
// useState 已存在，无需重复导入
```

## Acceptance Criteria

- [ ] 接口请求失败时，模型列表区域被替换为输入框
- [ ] 接口超时时，显示输入框而非错误文字
- [ ] 接口返回空数组时，显示输入框
- [ ] 输入框默认值为 `config.model_id`（当前已选模型）
- [ ] 按 Enter 键后，将输入值保存到 config 并关闭面板
- [ ] 不显示任何错误提示文字
- [ ] 空字符串输入不触发保存

## References

- **组件**: `zen-code/src/chat/components/panels/ModelPanel.tsx`
- **Hook**: `zen-code/src/chat/hooks/useModels.ts`
- **输入组件**: `packages/ink-pro/src/components/Input/MultiLineTextInput.tsx`
- **配置上下文**: `zen-code/src/chat/context/SettingsContext.tsx`

# History Panel Visibility Improvement

## 需求背景

用户反馈 zen-code 历史面板的选中状态表示非常不清楚，需要改进视觉反馈以提高可用性。

## 用户需求总结

### 选状态高亮元素

- 添加光标符号（如 `>`）
- 改变文字颜色（更亮/更粗）

### 当前对话项标识

- 当前对话项始终高亮，不管是否选中
- 使用箭头符号 `▶` 作为当前对话标记

### 设计风格

- 简洁风格（仅颜色变化）
- 不使用背景色反色

## 设计方案

### 视觉状态定义

| 状态            | 标记符号 | 文字颜色         | 粗体 | 备注       |
| --------------- | -------- | ---------------- | ---- | ---------- |
| 当前对话 + 选中 | `> ▶`    | cyanBright       | ✅   | 最高优先级 |
| 当前对话        | `▶`      | green            | ✅   | 次高优先级 |
| 普通选中        | `>`      | cyanBright       | ✅   | 选中状态   |
| 普通项          | 无       | statusInfo.color | ❌   | 默认状态   |

### 颜色方案

```typescript
// Ink 支持的颜色
cyanBright:    // 选中的主色调
green:          // 当前对话的主色调
gray:           // 非活动状态
yellow:         // busy 状态
orange:         // interrupted 状态
red:            // error 状态
```

### 布局结构

```
> ▶ 1. abc12345              10:30   ← 当前 + 选中
>   2. def67890              09:15   ← 普通选中
▶   3. ghi13579              08:20   ← 当前（未选中）
    4. jkl24680              昨天    ← 普通项
```

## 实现计划

### Phase 1: 修改 HistoryPanel.tsx 的 renderItem 函数

**文件**: `zen-code/src/chat/components/HistoryPanel.tsx`

**修改点**:

```typescript
// 原来
const renderItem = useCallback(
    (thread: any, index: number, isSelected: boolean) => {
        const statusInfo = getStatusInfo(thread.status);
        const isCurrent = thread.thread_id === currentChatId;
        const updatedTime = formatTime(new Date(thread.updated_at));

        return (
            <Box key={thread.thread_id}>
                <Text bold color={isSelected ? 'cyan' : statusInfo.color}>
                    {index + 1}. {thread.thread_id.slice(-8)}
                </Text>
                <Box flexGrow={1} />
                <Text dimColor>{updatedTime}</Text>
            </Box>
        );
    },
    [currentChatId],
);

// 修改后
const renderItem = useCallback(
    (thread: any, index: number, isSelected: boolean) => {
        const statusInfo = getStatusInfo(thread.status);
        const isCurrent = thread.thread_id === currentChatId;
        const updatedTime = formatTime(new Date(thread.updated_at));

        // 计算标记符号
        const cursorSymbol = isSelected ? '>' : ' ';
        const currentSymbol = isCurrent ? '▶' : ' ';

        // 计算颜色和样式
        const getDisplayStyle = () => {
            if (isCurrent) {
                // 当前对话始终高亮（绿色粗体）
                return { color: 'green' as const, bold: true };
            } else if (isSelected) {
                // 选中项用亮青色粗体
                return { color: 'cyanBright' as const, bold: true };
            } else {
                // 普通项使用状态颜色
                return { color: statusInfo.color, bold: false };
            }
        };

        const style = getDisplayStyle();

        return (
            <Box key={thread.thread_id}>
                <Text bold={style.bold} color={style.color}>
                    {cursorSymbol} {currentSymbol} {index + 1}. {thread.thread_id.slice(-8)}
                </Text>
                <Box flexGrow={1} />
                <Text dimColor>{updatedTime}</Text>
            </Box>
        );
    },
    [currentChatId],
);
```

### Phase 2: 测试验证

1. 测试当前对话 + 选中的双重高亮效果
2. 测试仅当前对话的高亮效果
3. 测试仅选中的高亮效果
4. 测试普通项的默认样式
5. 测试不同状态（idle/busy/interrupted/error）的颜色显示

## 技术要点

### useCallback 依赖

- `renderItem` 依赖 `[currentChatId]`
- 新实现保持相同依赖，不影响性能

### Ink Text 组件属性

- `color`: 支持 `cyanBright`, `green`, `yellow`, `orange`, `red`, `gray`
- `bold`: 布尔值，true 时文字加粗
- `dimColor`: 布尔值，true 时文字变暗（用于时间戳）

### 状态判断优先级

1. 最高优先级：`isCurrent && isSelected`
2. 次高优先级：`isCurrent`
3. 第三优先级：`isSelected`
4. 默认：普通状态

## 后续优化方向

1. **可配置化**: 将符号和颜色提取到配置文件，支持用户自定义
2. **主题支持**: 支持亮色/暗色主题切换
3. **动画效果**: 添加选中时的淡入淡出效果（如果 Ink 支持）
4. **键盘导航**: 保持现有的快捷键（↑/↓/PageUp/PageDown/Home/End）

## 参考

- UniversalPanel 系统: `packages/ink-pro/src/components/Panel/`
- HistoryPanel: `zen-code/src/chat/components/HistoryPanel.tsx`
- Panel 类型定义: `packages/ink-pro/src/components/Panel/types.ts`

## 验收标准

- [x] 选中项显示 `>` 光标符号
- [x] 当前对话显示 `▶` 箭头符号
- [x] 当前对话始终显示为绿色粗体
- [x] 选中项显示为 cyanBright 粗体
- [x] 普通项使用状态对应颜色
- [x] 双重状态（当前 + 选中）同时显示两个符号（无空格 `>▶`）
- [x] 时间戳保持 dimColor 状态
- [x] 构建验证通过
- [x] 代码已实现，可启动 TUI 测试验证
- [x] 打开面板时自动选中当前会话（而非第一项）

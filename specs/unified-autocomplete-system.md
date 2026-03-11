# 统一自动补全系统重构规格

> **状态**: ✅ 已完成 **创建日期**: 2026-03-11 **完成日期**: 2026-03-11 **相关文件**: `ChatInputBuffer.tsx`,
> `useSkillAutocomplete.ts`, `useAgentAutocomplete.ts`, `CommandHandler.tsx`

## 1. 概述

### 1.1 目标

将现有的分散自动补全实现（命令 `/`、技能 `#`、Agent `@`）重构为统一的补全系统，支持：

- **上下键导航**：在建议列表中移动选中项
- **Tab/右箭头补全**：选中当前高亮项
- **统一状态管理**：单一选中索引，统一的显示逻辑

### 1.2 当前实现分析

| 组件                 | 触发符 | 匹配方式             | 键盘导航 | 选中状态   |
| -------------------- | ------ | -------------------- | -------- | ---------- |
| CommandHandler       | `/`    | 前缀匹配             | ❌       | 始终第一个 |
| useSkillAutocomplete | `#`    | 模糊匹配 (fuzzysort) | ❌       | 始终第一个 |
| useAgentAutocomplete | `@`    | 前缀匹配             | ❌       | 始终第一个 |

**问题**：

1. 三个独立的 hook，逻辑重复
2. 无法用上下键选择不同选项
3. 只能用右箭头补全，Tab 键未支持
4. 选中项始终是第一个，用户无法选择

---

## 2. 功能需求

### 2.1 触发条件

| 触发符 | 触发位置     | 匹配字段      |
| ------ | ------------ | ------------- |
| `/`    | 行首或空白后 | 命令名        |
| `#`    | 行首或空白后 | 技能名 (模糊) |
| `@`    | 行首或空白后 | Agent 名/ID   |

### 2.2 键盘交互

| 按键         | 行为                                          |
| ------------ | --------------------------------------------- |
| `↑` (上箭头) | 移动选中项到上一项（循环：第一项 → 最后一项） |
| `↓` (下箭头) | 移动选中项到下一项（循环：最后一项 → 第一项） |
| `Tab`        | 补全当前选中项                                |
| `→` (右箭头) | 补全当前选中项（光标在行尾时）                |
| `Enter`      | 如果补全激活，补全选中项；否则提交消息        |
| `Esc`        | 关闭补全列表                                  |

### 2.3 显示格式

```
┌─────────────────────────────────────────────────────┐
│ 命令建议 (↑↓ 选择, Tab/→ 补全):                      │
│ ▶ /help        - 显示帮助信息                        │
│   /history     - 查看历史记录                        │
│   /model       - 切换模型                            │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 技能建议 (↑↓ 选择, Tab/→ 补全):                      │
│ ▶ #web-research                                      │
│   #tanstack-query                                    │
│   #find-skills                                       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Agent 建议 (↑↓ 选择, Tab/→ 补全):                    │
│ ▶ @default       - 代码实现助手                      │
│   @manager       - 任务管理员                        │
└─────────────────────────────────────────────────────┘
```

- **选中项**：`▶` 前缀 + 高亮颜色
- **非选中项**：`  ` 前缀 + 默认颜色
- **最大显示**：5 项

---

## 3. 技术设计

### 3.1 统一数据结构

```typescript
// 补全项通用接口
interface AutocompleteItem {
    id: string; // 唯一标识
    name: string; // 显示名称（用于补全）
    displayText: string; // 完整显示文本（包含触发符）
    description?: string; // 描述文字
    score?: number; // 匹配分数（用于排序）
}

// 补全类型
type AutocompleteType = 'command' | 'skill' | 'agent';

// 补全状态
interface AutocompleteState {
    type: AutocompleteType | null; // 当前补全类型
    visible: boolean; // 是否显示
    query: string; // 查询文本（不含触发符）
    items: AutocompleteItem[]; // 过滤后的候选项
    selectedIndex: number; // 当前选中索引
    triggerPosition: number; // 触发符位置
}
```

### 3.2 Hook 架构

```
useUnifiedAutocomplete (主 hook)
├── useAutocompleteTrigger   - 检测触发符并解析
├── useAutocompleteFilter    - 根据类型过滤候选项
├── useAutocompleteNavigation - 处理上下键导航
└── useAutocompleteComplete  - 处理补全逻辑
```

### 3.3 useUnifiedAutocomplete Hook

```typescript
interface UseUnifiedAutocompleteOptions {
    commands: Command[]; // 命令列表
    skills: Skill[]; // 技能列表
    agents: Agent[]; // Agent 列表
    maxVisible?: number; // 最大显示数量 (默认 5)
}

interface UseUnifiedAutocompleteReturn {
    state: AutocompleteState;

    // 触发检测
    checkTrigger: (input: string, cursorPosition?: number) => void;

    // 导航
    selectNext: () => void; // 下一项
    selectPrev: () => void; // 上一项

    // 补全
    getSelectedItem: () => AutocompleteItem | null;
    complete: (input: string) => string;

    // 控制
    hide: () => void;

    // 状态
    isActive: boolean;

    // 键盘处理
    handleKeyDown: (key: Key) => boolean; // 返回 true 表示已处理
}
```

### 3.4 组件集成

**修改 `ChatInputBuffer.tsx`**：

```typescript
// 替换现有的三个独立 hook
const autocomplete = useUnifiedAutocomplete({
  commands: commandSuggestions,
  skills,
  agents,
  maxVisible: 5,
});

// 在 onHotKey 中处理
onHotKey={(input, key) => {
  // 优先处理补全相关按键
  if (autocomplete.isActive) {
    // ⚠️ 关键：屏蔽输入框的上下键，防止光标移动
    if (key.upArrow) {
      autocomplete.selectPrev();
      return false; // 阻止 MultiLineTextInput 的默认上移行为
    }
    if (key.downArrow) {
      autocomplete.selectNext();
      return false; // 阻止 MultiLineTextInput 的默认下移行为
    }
    if (key.tab || key.rightArrow) {
      const completed = autocomplete.complete(internalValue);
      handleChange(completed);
      autocomplete.hide();
      return false;
    }
    if (key.escape) {
      autocomplete.hide();
      return false; // 阻止默认的 Esc 行为（清空输入）
    }
  }

  // 其他按键处理...
}}
```

**关键点**：

- `return false` 会阻止 `MultiLineTextInput` 的默认键盘行为
- 当 `autocomplete.isActive` 时，上下键用于导航补全列表而非移动光标
- 关闭补全后，上下键恢复正常的光标移动功能

### 3.5 统一 UI 组件

**`UnifiedAutocompleteUI.tsx`**：

```typescript
interface UnifiedAutocompleteUIProps {
  visible: boolean;
  type: AutocompleteType | null;
  items: AutocompleteItem[];
  selectedIndex: number;
  query: string;
}

export const UnifiedAutocompleteUI: React.FC<UnifiedAutocompleteUIProps> = ({
  visible,
  type,
  items,
  selectedIndex,
  query,
}) => {
  if (!visible || items.length === 0) return null;

  const title = {
    command: '命令建议',
    skill: '技能建议',
    agent: 'Agent 建议',
  }[type!];

  return (
    <Box marginBottom={1} flexDirection="column">
      <Text color="yellow" bold>
        {title} (↑↓ 选择, Tab/→ 补全):
      </Text>
      {items.map((item, index) => (
        <Box key={item.id}>
          <Text color={index === selectedIndex ? 'yellow' : undefined}>
            {index === selectedIndex ? '▶ ' : '  '}
          </Text>
          <HighlightedText
            text={item.displayText}
            query={query}
            isHighlighted={index === selectedIndex}
          />
          {item.description && (
            <Text dimColor> - {item.description}</Text>
          )}
        </Box>
      ))}
      {items.length > maxVisible && (
        <Text color="gray">...还有 {items.length - maxVisible} 项</Text>
      )}
    </Box>
  );
};
```

---

## 4. 迁移计划

### 4.1 Phase 1: 创建统一 Hook

1. 创建 `useUnifiedAutocomplete.ts`
2. 实现触发检测、过滤、导航、补全逻辑
3. 编写单元测试

### 4.2 Phase 2: 创建统一 UI 组件

1. 创建 `UnifiedAutocompleteUI.tsx`
2. 实现选中高亮、匹配高亮
3. 统一三种类型的显示样式

### 4.3 Phase 3: 集成到 ChatInputBuffer

1. 替换 `useSkillAutocomplete` + `useAgentAutocomplete` + 命令逻辑
2. 修改 `onHotKey` 处理上下键
3. 保持向后兼容（渐进式迁移）

### 4.4 Phase 4: 清理

1. 标记旧 hook 为 deprecated
2. 移除 `SkillAutocompleteUI.tsx` 和 `AgentAutocompleteUI.tsx`
3. 更新文档

---

## 5. 文件变更清单

### 5.1 新增文件

| 文件路径                                                       | 描述          |
| -------------------------------------------------------------- | ------------- |
| `zen-code/src/chat/hooks/useUnifiedAutocomplete.ts`            | 统一补全 hook |
| `zen-code/src/chat/hooks/useUnifiedAutocomplete.test.ts`       | 单元测试      |
| `zen-code/src/chat/components/input/UnifiedAutocompleteUI.tsx` | 统一 UI 组件  |

### 5.2 修改文件

| 文件路径                                                 | 变更内容           |
| -------------------------------------------------------- | ------------------ |
| `zen-code/src/chat/components/input/ChatInputBuffer.tsx` | 集成统一补全 hook  |
| `zen-code/src/chat/context/CommandHandler.tsx`           | 提供命令列表数据源 |

### 5.3 废弃文件（Phase 4 后删除）

| 文件路径                                                     | 原因                           |
| ------------------------------------------------------------ | ------------------------------ |
| `zen-code/src/chat/hooks/useSkillAutocomplete.ts`            | 被 useUnifiedAutocomplete 替代 |
| `zen-code/src/chat/hooks/useAgentAutocomplete.ts`            | 被 useUnifiedAutocomplete 替代 |
| `zen-code/src/chat/components/input/SkillAutocompleteUI.tsx` | 被 UnifiedAutocompleteUI 替代  |
| `zen-code/src/chat/components/input/AgentAutocompleteUI.tsx` | 被 UnifiedAutocompleteUI 替代  |

---

## 6. 测试用例

### 6.1 Hook 测试

```typescript
describe('useUnifiedAutocomplete', () => {
    // 基础功能
    it('should detect command trigger /');
    it('should detect skill trigger #');
    it('should detect agent trigger @');
    it('should not trigger in middle of word');
    it('should trigger after whitespace');

    // 过滤
    it('should filter commands by prefix');
    it('should filter skills with fuzzy matching');
    it('should filter agents by name/id');
    it('should limit results to maxVisible');

    // 导航
    it('should select next item on downArrow');
    it('should select prev item on upArrow');
    it('should wrap around when navigating (last → first)');
    it('should start with selectedIndex = 0');

    // 补全
    it('should complete with selected item');
    it('should complete at correct position');
    it('should return original input when no selection');

    // 边界情况
    it('should hide when query exactly matches item name');
    it('should handle empty item lists');
    it('should handle switching trigger types');
    it('should preserve cursor position after completion');
});
```

### 6.2 集成测试

```typescript
describe('ChatInputBuffer with autocomplete', () => {
    it('should show command suggestions on /');
    it('should show skill suggestions on #');
    it('should show agent suggestions on @');
    it('should navigate with up/down arrows');
    it('should complete with Tab');
    it('should complete with right arrow at end of line');
    it('should close on Esc');
    it('should not interfere with normal typing');
});
```

---

## 7. 边界情况处理

| 情况             | 处理方式                       |
| ---------------- | ------------------------------ |
| 多个触发符       | 只响应最后一个（光标位置）     |
| 触发符在单词中间 | 不触发                         |
| 空候选项列表     | 不显示补全                     |
| 无匹配结果       | 显示"无匹配"提示               |
| 完全匹配项名     | 自动隐藏补全                   |
| 快速切换触发符   | 重置选中索引为 0               |
| 补全后有后续文本 | 保留后续文本（在补全后加空格） |

---

## 8. 性能考虑

1. **模糊匹配优化**：使用 fuzzysort 的 `prepare()` 预处理技能名
2. **状态批处理**：使用 `useReducer` 避免多次渲染
3. **虚拟化**：候选项超过 100 项时考虑虚拟滚动（当前 maxVisible=5 不需要）
4. **防抖**：输入变化时的过滤操作（可选，当前输入频率不高）

---

## 9. 交互流程图

```
用户输入 "#we"
    │
    ▼
检测到 # 触发符
    │
    ▼
过滤技能列表 → ["web-research", "web-design-guidelines"]
    │
    ▼
显示补全 UI (selectedIndex=0)
    │
    ├── 用户按 ↓ ──→ selectedIndex=1
    │
    ├── 用户按 ↑ ──→ selectedIndex=0 (循环)
    │
    ├── 用户按 Tab ──→ 补全为 "#web-research "
    │
    └── 用户继续输入 "b" ──→ 重新过滤 → ["web-research"]
```

---

## 10. 参考资源

- 现有实现：
    - `useSkillAutocomplete.ts` - 模糊匹配逻辑
    - `useAgentAutocomplete.ts` - 前缀匹配逻辑
    - `CommandHandler.tsx` - 命令补全逻辑
- 相关 spec：
    - `skill-autocomplete.md` - 技能补全原始规格
- 库：
    - `fuzzysort` - 模糊匹配库

---

## 变更历史

| 版本 | 日期       | 描述                       |
| ---- | ---------- | -------------------------- |
| 1.0  | 2026-03-11 | 初始版本，基于现有实现分析 |

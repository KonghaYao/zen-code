# Skill Autocomplete 功能规格文档

> **状态**: ✅ 已实现（2026-03-06 验证 - `SkillAutocompleteUI.tsx` 和 `useSkillAutocomplete.ts` 均已实现）

## 1. 概述

### 1.1 目标

为 TUI 聊天输入添加 `#skill-name` 自动补全功能，类似现有的 `/` 命令补全，让用户能够快速引用技能。

### 1.2 用户场景

**触发场景**：

- 用户输入 `#` 后，希望快速选择一个技能
- 用户输入 `#web` 后，希望看到匹配的技能列表
- 用户希望通过右键快速补全技能名称

**预期效果**：

```
用户输入: #wr    → 显示: #web-research
用户选择: 右键   → 补全为: #web-research
```

---

## 2. 核心功能

### 2.1 触发条件

| 场景                  | 行为                          |
| --------------------- | ----------------------------- |
| 输入 `#` 后无其他文本 | 显示前 5 个技能（按名称排序） |
| 输入 `#xxx`           | 前缀匹配过滤，显示匹配结果    |
| 无匹配结果            | 显示空列表或提示"无匹配技能"  |

### 2.2 匹配规则

- **匹配方式**：前缀匹配（`#web` 匹配 `web-research`）
- **匹配字段**：仅匹配技能名称（`name`），不匹配描述
- **排序规则**：按名称字母顺序排序

### 2.3 显示格式

```
技能建议 (按 → 补全):
  #web-research
  #tanstack-query
  #find-skills
  #skill-creator
  #brainstorming
```

- **一行一项**：仅显示 `#` + 技能名称
- **高亮匹配部分**：`#web` 匹配时，`web` 部分高亮显示

### 2.4 交互方式

| 操作       | 行为                 |
| ---------- | -------------------- |
| → (右箭头) | 补全第一个匹配的技能 |
| Esc        | 关闭补全列表         |
| 继续输入   | 实时过滤列表         |

### 2.5 补全行为

选中技能后：

- **替换内容**：将 `#xxx` 替换为完整名称 `#skill-name `
- **自动关闭**：补全后自动关闭建议列表

**示例**：

```
输入: This is #web█
按 →: This is #web-research █
```

---

## 3. 技术设计

### 3.1 数据源

复用现有的 `useSkills` hook：

```typescript
interface Skill {
    name: string; // 技能名称，如 "web-research"
    description: string; // 简短描述
    path: string; // 技能路径
}
```

### 3.2 组件架构

```
ChatInput (业务组件)
├── useSkills hook → 获取技能列表
├── useSkillAutocomplete hook → 管理补全状态
├── SkillAutocompleteHintUI → 显示建议列表
├── CommandAutocompleteWrapper (现有 - 检测 / 并渲染列表)
└── ChatInputBuffer (输入组件)
    └── MultiLineTextInput (ink-pro)
```

### 3.3 状态管理

```typescript
interface SkillAutocompleteState {
    visible: boolean; // 是否显示列表
    query: string; // 当前查询文本（不含 #）
    filteredSkills: Skill[]; // 过滤后的技能列表
    triggerPosition: number; // # 触发位置
}
```

### 3.4 关键实现点

1. **触发检测**：检测 `#` 输入，且 `#` 前必须是空白或行首
2. **前缀匹配**：`skill.name.toLowerCase().startsWith(query.toLowerCase())`
3. **自动关闭**：当 query 完全匹配技能名称时，自动隐藏列表
4. **补全逻辑**：替换 `#xxx` 为 `#skill-name `

---

## 4. 实现状态

### 4.1 TUI 实现 ✅ 已完成

- [x] 创建 `useSkillAutocomplete` hook
- [x] 实现前缀匹配过滤逻辑
- [x] 集成 `useSkills` hook 获取技能列表
- [x] 添加右键补全支持
- [x] 添加 `SkillAutocompleteHintUI` 组件
- [x] 集成到 `ChatInputBuffer` 组件
- [x] 测试覆盖（17 个测试用例）

### 4.2 实现文件

| 文件路径                                                     | 描述                  |
| ------------------------------------------------------------ | --------------------- |
| `zen-code/src/chat/hooks/useSkillAutocomplete.ts`            | 技能补全状态管理 hook |
| `zen-code/src/chat/hooks/useSkillAutocomplete.test.ts`       | 单元测试              |
| `zen-code/src/chat/components/input/SkillAutocompleteUI.tsx` | UI 组件               |
| `zen-code/src/chat/components/input/ChatInputBuffer.tsx`     | 集成点                |
| `zen-code/src/chat/Chat.tsx`                                 | 技能数据传递          |

### 4.3 Web UI 实现（后续）

- [ ] 迁移 TUI 实现到 Web
- [ ] 适配 Web 交互方式

---

## 5. 边界情况

| 情况           | 处理方式                          |
| -------------- | --------------------------------- |
| 技能列表为空   | 不显示建议列表                    |
| 无匹配结果     | 显示空列表，保留输入              |
| `#` 在单词中间 | 不触发补全（仅 `#` 在空白后触发） |
| 多个 `#`       | 只响应最后一个 `#`                |
| 完全匹配技能名 | 自动关闭建议列表                  |

---

## 6. 测试用例

### 6.1 功能测试

```typescript
describe('useSkillAutocomplete', () => {
    it('should have initial hidden state');
    it('should show suggestions when # is typed');
    it('should filter skills by prefix');
    it('should be case-insensitive');
    it('should limit suggestions to maxSuggestions');
    it('should not trigger in middle of word');
    it('should trigger after whitespace');
    it('should get first skill');
    it('should complete skill name with first match');
    it('should hide autocomplete');
    it('should handle empty skills list');
    it('should handle no matching skills');
    it('should find last # in input');
    it('should complete at correct position');
    it('should return null for getFirstSkill when not active');
    it('should return original input when completing with no match');
    it('should hide autocomplete when query exactly matches skill name');
});
```

---

## 7. 参考资源

- 现有 `/` 命令补全实现
- `useSkills` hook
- `ChatInputBuffer` 组件

---

## 变更历史

| 版本 | 日期       | 描述                                                          |
| ---- | ---------- | ------------------------------------------------------------- |
| 1.0  | 2026-02-16 | 初始版本，基于 Interview Mode 收集的需求                      |
| 1.1  | 2026-02-16 | 更新组件架构，将补全逻辑移至 ChatInput 层                     |
| 1.2  | 2026-02-16 | 简化交互：移除键盘导航，仅保留右键补全；移除 description 显示 |
| 1.3  | 2026-02-16 | TUI 实现完成，更新实现状态和文件列表                          |

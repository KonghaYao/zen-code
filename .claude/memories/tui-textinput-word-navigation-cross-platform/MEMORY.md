---
name: "tui-textinput-word-navigation-cross-platform"
description: "为 Ink 的 MultiLineTextInput 组件添加跨平台词级导航和删除功能。Windows/Linux 使用 Ctrl 键，macOS 使用 Option 键（通过 key.meta 检测）。实现包括 findWordBoundary 函数用于计算单词边界，修改左右箭头键支持 Ctrl/Option+方向跳词，修改 Backspace/Delete 支持 Ctrl/Option+按键按词删除。适用于需要增强文本编辑体验的 TUI 应用。"
tags: ["ink", "tui", "text-input", "keyboard-shortcuts", "cross-platform"]
category: "workflow"
created: "2025-01-13"
last_updated: "2025-01-13"
priority: "medium"
context_scope: "project"
---

# ## 背景

## 背景

MultiLineTextInput 组件需要增强文本编辑体验，支持词级操作（跳词、按词删除），并兼容 Windows/Linux 和 macOS 的不同快捷键习惯。

## 实现方案

### 1. 添加 findWordBoundary 辅助函数

文件：`tui/src/chat/components/input/MultiLineTextInput.tsx`

```typescript
function findWordBoundary(line: string, cursorColumn: number, direction: -1 | 1): number {
    const length = line.length;
    
    if (direction === -1) {
        // Moving left - find start of previous word
        if (cursorColumn === 0) return 0;
        
        let pos = cursorColumn - 1;
        
        // Skip trailing whitespace
        while (pos > 0 && /\s/.test(line[pos])) {
            pos--;
        }
        
        // Skip word characters
        while (pos > 0 && !/\s/.test(line[pos])) {
            pos--;
        }
        
        // Move to first character of the word
        if (pos > 0 || (pos === 0 && !/\s/.test(line[0]))) {
            return pos;
        }
        return 0;
    } else {
        // Moving right - find start of next word
        if (cursorColumn >= length) return length;
        
        let pos = cursorColumn;
        
        // Skip word characters
        while (pos < length && !/\s/.test(line[pos])) {
            pos++;
        }
        
        // Skip whitespace
        while (pos < length && /\s/.test(line[pos])) {
            pos++;
        }
        
        return pos;
    }
}
```

### 2. 修改箭头键处理（跳词功能）

完整实现参见 `tui/src/chat/components/input/MultiLineTextInput.tsx:245-275`

核心逻辑：
- 检测条件：`key.ctrl || key.meta`
- Windows/Linux: `key.ctrl` → Ctrl 键
- macOS: `key.meta` → Option/Cmd 键

### 3. 修改删除键处理（按词删除）

完整实现参见 `tui/src/chat/components/input/MultiLineTextInput.tsx:310-405`

关键逻辑：
- **Ctrl/Cmd+Backspace**: 删除从光标到单词开头的文本，光标移到删除位置
- **Ctrl/Cmd+Delete**: 删除从光标到单词结尾的文本，光标保持原位

## 快捷键对照表

| 操作 | Windows/Linux | macOS |
|------|---------------|-------|
| 跳词左移 | Ctrl+← | Option+← |
| 跳词右移 | Ctrl+→ | Option+→ |
| 删除左词 | Ctrl+Backspace | Option+Backspace |
| 删除右词 | Ctrl+Delete | Option+Delete |

## 技术要点

1. **跨平台检测**：使用 `key.ctrl || key.meta` 同时支持不同平台
2. **单词边界定义**：基于空白字符 `/\s/` 分隔单词
3. **Ink 库行为**：在 macOS 上，Option 和 Cmd 键都会被映射为 `key.meta`

## 适用场景

- 使用 Ink 构建的 TUI/CLI 应用
- 需要增强文本输入体验的场景
- 需要跨平台快捷键支持的组件

## 注意事项

- Ink 库在 macOS 上 Option 键的检测可能受限（取决于终端支持）
- `key.meta` 同时捕获 Option 和 Cmd 键，无法精确区分
- 单词边界基于空白字符，不支持更复杂的 Unicode 单词边界检测

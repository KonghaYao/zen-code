---
name: "terminal-keypress-platform-specific-codes"
description: "终端应用跨平台快捷键编码处理方案；解决了 macOS Option+Backspace（\x17）和 Option+Delete（\x1Bd）的识别问题；涉及 ANSI 转义序列、修饰键检测、以及 Ctrl+W 与 Option+Backspace 的歧义处理；适用于所有基于终端的文本输入组件开发"
tags: ["terminal", "keypress", "macos", "ansi-escape", "cross-platform"]
category: "bug-fix"
created: "2025-01-13"
last_updated: "2025-01-13"
priority: "high"
context_scope: "project"
---

# ## 问题 1: MultiLineTextInput 光标重置 Bug

## 问题 1: MultiLineTextInput 光标重置 Bug

**文件**: `tui/src/chat/components/input/MultiLineTextInput.tsx:194-210`

**问题**: 第一次输入时无法 backspace 删除字符，必须先左移一位才能删除

**根本原因**: `useEffect` 依赖 `originalValue`，每次输入触发 state 同步，`clampCursor` 强制将光标移到行末，导致光标位置错位

**修复方案**: 在 `useEffect` 中添加值比较，值未改变时跳过更新

```typescript
// Sync state with external value changes
useEffect(() => {
    setState((previousState) => {
        const lines = splitTextIntoLines(originalValue);
        const newValue = joinLinesIntoText(lines);
        const oldValue = joinLinesIntoText(previousState.lines);

        // Only update if value actually changed (avoid cursor reset on every input)
        if (newValue === oldValue) {
            return previousState;
        }

        const clamped = clampCursor(lines, previousState.cursorLine, previousState.cursorColumn);
        return {
            ...previousState,
            lines,
            ...clamped,
        };
    });
}, [originalValue]);
```

## 问题 2: macOS Option+Backspace 识别错误

**文件**: `tui/src/utils/keypress.ts:156-173`

**问题**: `\x17` (0x17) 被识别为 `Ctrl+W`，但在 macOS 上这应该是 `Option+Backspace`（词删除）

**歧义分析**:
- 技术上: ASCII 0x17 = Ctrl+W
- 实际上: macOS 终端 Option+Backspace 产生 `\x17`
- Shell 行为: 大多数 shell 拦截 Ctrl+W 用于 unix-word-rubout

**解决方案**: 在通用 ctrl+letter 处理前特殊判断 `\x17`

```typescript
} else if (s.length === 1 && s <= '\x1a') {
    // ctrl+letter
    const code = s.charCodeAt(0);
    const letter = String.fromCharCode(code + 'a'.charCodeAt(0) - 1);

    // Special case: \x17 (0x17) is ambiguous
    // - Could be Ctrl+W (rare in TUI apps, usually intercepted by shell)
    // - On macOS: Option+Backspace for word deletion (more common)
    // Since Ctrl+W is typically handled by shell/terminal for unix-word-rubout,
    // applications receiving \x17 should treat it as Option+Backspace
    if (code === 0x17) {
        key.name = 'backspace';
        key.option = true;
        key.meta = true;
    } else {
        key.name = letter;
        key.ctrl = true;
    }
}
```

## 问题 3: macOS Option+Delete 识别

**文件**: `tui/src/utils/keypress.ts:178-190`

**需求**: `\x1Bd` 在 macOS 上是 Option+Delete（向前删除词）

**解决方案**: 在 metaKeyCodeRe 处理中添加映射

```typescript
} else if ((parts = metaKeyCodeRe.exec(s))) {
    key.meta = true;
    key.shift = /^[A-Z]$/.test(parts[1]!);

    /** vscode macOS */
    key.name =
        key.name ||
        {
            '\x1Bf': 'right',
            '\x1Bb': 'left',
            '\x1Bd': 'delete', // Option+Delete on macOS (delete word forward)
        }[key.raw!]!;

    // Set option flag for Option+Delete
    if (key.raw === '\x1Bd' && key.name === 'delete') {
        key.option = true;
    }
}
```

## 词级操作快捷键对照

| 操作 | macOS | Linux/Windows |
|------|-------|---------------|
| 向后删除词 | Option+Backspace (`\x17`) | Ctrl+Backspace |
| 向前删除词 | Option+Delete (`\x1Bd`) | Ctrl+Delete |
| 跳到词首 | Option+← (`\x1Bb`) | Ctrl+← |
| 跳到词尾 | Option+→ (`\x1Bf`) | Ctrl+→ |

## 文档输出

创建了完整的快捷键编码参考文档：`specs/keyboard-shortcuts.md`

包含：
- macOS、Linux/Windows 平台特定键码列表
- 跨平台通用按键编码
- 修饰键检测机制（ANSI 修饰位、前缀字符、特殊序列）
- 词级导航与删除快捷键对比
- `\x17` 歧义处理说明
- Meta/Option/Alt 统一标识方案

## 关键要点

1. **终端层无法区分**: `\x17` 在终端层无法区分是 Ctrl+W 还是 Option+Backspace
2. **实际用例优先**: 选择处理为 Option+Backspace，因为 Ctrl+W 通常被 shell 拦截
3. **meta 标志统一**: 使用 `meta` 作为 Option/Alt/Cmd 的通用标志
4. **值变化检测**: 外部值同步时需检查值是否真正改变，避免光标重置

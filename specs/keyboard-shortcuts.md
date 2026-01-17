# 快捷键编码参考文档

本文档描述了 TUI 应用在不同平台下的快捷键编码规范。

## 平台特定键码

### macOS

-   **Option+Backspace**

    -   转义序列: `\x17`
    -   十六进制: `0x17`
    -   检测为: `backspace + option + meta`

-   **Option+Delete**

    -   转义序列: `\x1Bd`
    -   十六进制: `ESC + d`
    -   检测为: `delete + option + meta`

-   **Option+←**

    -   转义序列: `\x1Bb`
    -   十六进制: `ESC + b`
    -   检测为: `left + option + meta`

-   **Option+→**
    -   转义序列: `\x1Bf`
    -   十六进制: `ESC + f`
    -   检测为: `right + option + meta`

### Linux / Windows (通用终端)

-   **Ctrl+Backspace**

    -   转义序列: `\x08` 或 `\x7f`
    -   十六进制: `0x08` / `0x7f`
    -   检测为: `backspace + ctrl`

-   **Ctrl+Delete**

    -   转义序列: `[3;5~`
    -   十六进制: ANSI 序列
    -   检测为: `delete + ctrl`

-   **Ctrl+←**

    -   转义序列: `[1;5D`
    -   十六进制: ANSI 序列
    -   检测为: `left + ctrl`

-   **Ctrl+→**

    -   转义序列: `[1;5C`
    -   十六进制: ANSI 序列
    -   检测为: `right + ctrl`

-   **Ctrl+W**
    -   转义序列: `\x17`
    -   十六进制: `0x17`
    -   检测为: 解释为 `w` (但通常被 shell 拦截)

**注意**: 在 Linux/Windows 上，`\x17` 技术上是 Ctrl+W，但大多数 shell 会在传递给应用前拦截它用于 unix-word-rubout（删除
单词）。由于我们在终端层面无法区分 Ctrl+W 和 Option+Backspace，因此将 `\x17` 统一处理为 Option+Backspace，以保持与 macOS
词删除行为的一致性。

## 通用按键 (跨平台)

-   **Backspace**

    -   转义序列: `\b` 或 `\x7f`
    -   十六进制: `0x08` / `0x7f`
    -   检测为: `backspace`

-   **Delete**

    -   转义序列: `[3~`
    -   十六进制: ANSI 序列
    -   检测为: `delete`

-   **Enter**

    -   转义序列: `\n` 或 `\r`
    -   十六进制: `0x0a` / `0x0d`
    -   检测为: `enter` / `return`

-   **Tab**

    -   转义序列: `\t`
    -   十六进制: `0x09`
    -   检测为: `tab`

-   **Escape**

    -   转义序列: `\x1b`
    -   十六进制: `0x1b`
    -   检测为: `escape`

-   **Space**

    -   转义序列: ` ` (空格)
    -   十六进制: `0x20`
    -   检测为: `space`

-   **Home**

    -   转义序列: `[1~` 或 `[H`
    -   十六进制: ANSI 序列
    -   检测为: `home`

-   **End**

    -   转义序列: `[4~` 或 `[F`
    -   十六进制: ANSI 序列
    -   检测为: `end`

-   **Page Up**

    -   转义序列: `[5~`
    -   十六进制: ANSI 序列
    -   检测为: `pageup`

-   **Page Down**

    -   转义序列: `[6~`
    -   十六进制: ANSI 序列
    -   检测为: `pagedown`

-   **↑ (上箭头)**

    -   转义序列: `[A`
    -   十六进制: ANSI 序列
    -   检测为: `up`

-   **↓ (下箭头)**

    -   转义序列: `[B`
    -   十六进制: ANSI 序列
    -   检测为: `down`

-   **← (左箭头)**

    -   转义序列: `[D`
    -   十六进制: ANSI 序列
    -   检测为: `left`

-   **→ (右箭头)**
    -   转义序列: `[C`
    -   十六进制: ANSI 序列
    -   检测为: `right`

## 修饰键检测

按键解析器 (`src/utils/keypress.ts`) 通过以下方式检测修饰键：

### ANSI 修饰位

转义序列如 `[1;5C` 包含修饰标志：

-   位 1 (值 2): Shift
-   位 2 (值 4): Ctrl
-   位 3 (值 8): Option/Alt
-   位 4 (值 16): Meta/Cmd

### 前缀字符

单字符序列：

-   `\x01`-`\x1a`: Ctrl+字母 (除 `\x17` 特殊情况)
-   `\x1b` + 字母: Meta/Option+字母

### 特殊序列

平台特定模式：

-   `\x1b\x1b`: 双转义表示 Option 修饰键
-   `\x17`: 有歧义，处理为 Option+Backspace

## 词级导航与删除

所有平台通过不同快捷键支持词级操作：

### 向后删除词

-   macOS: Option+Backspace
-   Linux/Windows: Ctrl+Backspace

### 向前删除词

-   macOS: Option+Delete
-   Linux/Windows: Ctrl+Delete

### 跳到词首

-   macOS: Option+←
-   Linux/Windows: Ctrl+←

### 跳到词尾

-   macOS: Option+→
-   Linux/Windows: Ctrl+→

### 跳到行首

-   macOS: Cmd+← 或 Ctrl+A
-   Linux/Windows: Ctrl+A

### 跳到行尾

-   macOS: Cmd+→ 或 Ctrl+E
-   Linux/Windows: Ctrl+E

## 实现说明

### 特殊情况：`\x17` 歧义

字符 `\x17` (0x17 = 23) 存在歧义：

-   **技术上**: ASCII 中的 Ctrl+W
-   **实际上**: macOS 终端的 Option+Backspace
-   **Shell 行为**: 大多数 shell 拦截 Ctrl+W 用于 unix-word-rubout
-   **我们的方案**: 处理为 `backspace + option + meta` 以支持 macOS 词删除

### Meta vs Option vs Alt

不同平台使用不同术语：

-   **macOS**: Option 键 (在解析器中检测为 `meta`)
-   **Windows**: Alt 键 (同样为 `meta`)
-   **Linux**: Alt 键 (同样为 `meta`)

我们的解析器使用 `meta` 作为这些修饰键的通用标志，并添加额外的 `option` 标志用于 macOS 特定行为。

### 参考资料

-   原始实现基于
    [enquirer keypress.js](https://github.com/enquirer/enquirer/blob/36785f3399a41cd61e9d28d1eb9c2fcd73d69b4c/lib/keypress.js)
-   ANSI 转义序列: [VT100 Reference](http://www.vt100.net/docs/vt100-ug/chapter3.html)
-   终端输入处理: [Termios](https://man7.org/linux/man-pages/man3/termios.3.html)

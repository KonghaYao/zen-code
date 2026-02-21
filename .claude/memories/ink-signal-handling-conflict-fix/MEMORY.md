---
name: ink-signal-handling-conflict-fix
description:
    修复 Ink TUI 应用中 Ctrl+C 不能关闭程序的信号处理冲突问题；原因包括 Ink 默认 exitOnCtrlC 行为、bash_manager 的
    SIGINT 处理器调用 process.exit(0)、useInput 钩子无法执行；解决方案是禁用 Ink 默认退出并移除 bash_manager 的
    process.exit()；适用于需要自定义 Ctrl+C 处理的 TUI 应用场景
tags:
    - ink
    - signal-handling
    - ctrl+c
    - tui
    - bug-fix
category: bug-fix
created: 2025-01-19
last_updated: 2025-01-19
priority: medium
context_scope: project
---

# ## 背景

## 背景

用户反馈 Ctrl+C 不能关闭 TUI 程序，最近更改了 terminal 工具导致的。

## 问题原因

**三层 Ctrl+C 处理冲突**：

1. **Ink 默认行为**：`render()` 默认 `exitOnCtrlC: true`，会在 Ctrl+C 时捕获 `\x03` 并调用 `unmount()` 退出
2. **bash_manager 的 SIGINT 处理器**：直接调用 `process.exit(0)`，覆盖了所有其他处理
3. **主程序的 useInput 钩子**：根本无法执行

当用户按 Ctrl+C 时：

- Ink 捕获 Ctrl+C 并尝试优雅退出
- bash_manager 的 SIGINT 处理器立即强制退出
- 主程序的 `useInput` 钩子没有机会执行

## 解决方案

### 1. 修改 bash_manager.ts

移除 SIGINT 和 SIGTERM 信号处理器中的 `process.exit(0)`，现在只负责清理后台进程：

```typescript
// 信号处理 - 只清理后台进程，不退出进程（由主程序控制）
process.on('SIGINT', () =\&gt; {
    cleanupAllBackgroundProcessesSync();
});
process.on('SIGTERM', () =\&gt; {
    cleanupAllBackgroundProcessesSync();
});
```

**文件位置**：`packages/agent/src/tools/bash_tools/bash_manager.ts:170-177`

### 2. 修改 app.tsx

禁用 Ink 的默认 Ctrl+C 退出行为：

```typescript
import { render } from 'ink';
import { Chat } from './index';

render(&lt;Chat /&gt;, { exitOnCtrlC: false });
```

**文件位置**：`zen-code/src/app.tsx:4`

## 修复后的流程

1. `exitOnCtrlC: false` 禁用 Ink 的默认退出
2. Ink 的 App 组件不再拦截 Ctrl+C
3. `useInput` 钩子捕获到 Ctrl+C
4. 主程序的逻辑执行 `process.exit()`
5. bash_manager 的 SIGINT 处理器只清理后台进程，不干扰退出

## 适用场景

- 使用 Ink 构建的 TUI 应用
- 需要自定义 Ctrl+C 处理逻辑
- 有多个信号处理器需要协调的场景

## 注意事项

- 禁用 Ink 的 `exitOnCtrlC` 后，必须自行处理 Ctrl+C
- 多个信号处理器需要注意执行顺序，避免相互干扰
- SIGINT 处理器应该只负责清理，不直接调用 process.exit()

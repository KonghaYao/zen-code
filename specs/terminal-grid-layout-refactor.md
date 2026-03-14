# Terminal Grid Layout Refactor

## 概述

重构 zen-swarm 中的 Terminal 模块，支持左侧 Tab 工作区切换 + 右侧多终端网格分割布局。

**目标文件**: `zen-swarm/src/frontend/components/terminal/`

---

## 需求汇总

### 1. 左侧 Tab 侧边栏

- **每个 Tab 对应一个工作区/项目**（而非单个 terminal 会话）
- Tab 内可独立管理多个分割 Terminal
- 支持 Tab 重命名（双击）
- 支持新建/删除 Tab

### 2. 右侧 Header

显示当前 **活跃 terminal 面板** 的信息：

| 字段     | 说明                      |
| -------- | ------------------------- |
| `cwd`    | 当前工作目录（完整路径）  |
| 连接状态 | `active` / `disconnected` |
| 当前命令 | 正在执行的命令（如有）    |

### 3. Terminal 区域（网格布局）

- 默认单 terminal 铺满
- **最多 2×2 网格**（4 个 terminal）
- 快捷键：
    - `Cmd+D` — 垂直分割（左右）
    - `Cmd+Shift+D` — 水平分割（上下）
    - `Cmd+W` — 关闭当前 terminal 面板
    - `Cmd+[` / `Cmd+]` — 切换活跃 terminal 面板（左/右）
    - `Cmd+↑` / `Cmd+↓` — 切换活跃 terminal 面板（上/下）

### 4. 网格扩展规则

```
1 terminal:  [     A     ]
2 terminals (垂直分割): [ A | B ]
2 terminals (水平分割): [  A  ]
                        [  B  ]
3 terminals:  [ A | B ]
              [   C   ]   (或 [A][B|C])
4 terminals:  [ A | B ]
              [ C | D ]
```

最多 4 个，超过后分割按钮禁用。

---

## 架构设计

### 新数据结构

```typescript
// 工作区 Tab（替代现有 session tab 概念）
interface TerminalWorkspace {
    id: string;
    name: string;
    layout: GridLayout; // 当前网格布局
    activePaneId: string; // 当前激活的 pane
}

// 网格布局
interface GridLayout {
    panes: TerminalPane[];
    direction?: 'horizontal' | 'vertical'; // 顶层分割方向
}

// 单个 terminal 面板
interface TerminalPane {
    id: string;
    sessionId: string | null; // null = 待创建
    split?: {
        direction: 'horizontal' | 'vertical';
        children: [TerminalPane, TerminalPane];
    };
}
```

### 组件结构

```
TerminalView (重构主容器)
├── TerminalWorkspaceTabs   ← 左侧纵向 Tab 栏（新增）
│   ├── WorkspaceTab (×N)
│   └── AddWorkspaceButton
└── TerminalWorkspaceContent ← 右侧内容区
    ├── TerminalHeader       ← 顶部信息栏（新增）
    │   ├── CwdDisplay
    │   ├── ConnectionStatus
    │   └── CommandStatus
    └── TerminalGrid         ← 网格分割区域（新增）
        ├── TerminalPane #1
        ├── TerminalPane #2
        ├── TerminalPane #3
        └── TerminalPane #4
```

### 状态管理扩展

扩展 `terminalStore`（`zen-swarm/src/frontend/stores/terminalStore.ts`）：

```typescript
// 新增字段
workspaces: TerminalWorkspace[];
activeWorkspaceId: string;

// 新增 actions
createWorkspace(name?: string): void;
deleteWorkspace(id: string): void;
renameWorkspace(id: string, name: string): void;
setActiveWorkspace(id: string): void;

splitPane(paneId: string, direction: 'horizontal' | 'vertical'): void;
closePaneSession(paneId: string): void;
setActivePaneInWorkspace(workspaceId: string, paneId: string): void;
```

---

## 文件变更计划

### 新增文件

| 文件                                            | 说明               |
| ----------------------------------------------- | ------------------ |
| `components/terminal/TerminalWorkspaceTabs.tsx` | 左侧工作区 Tab 栏  |
| `components/terminal/TerminalHeader.tsx`        | 右侧顶部 Header    |
| `components/terminal/TerminalGrid.tsx`          | 网格布局容器       |
| `components/terminal/TerminalPane.tsx`          | 单个 terminal 面板 |
| `components/terminal/useTerminalKeyboard.ts`    | 快捷键 hook        |

### 修改文件

| 文件                                   | 变更说明                      |
| -------------------------------------- | ----------------------------- |
| `components/terminal/TerminalView.tsx` | 重构为左右布局                |
| `components/terminal/types.ts`         | 添加 Workspace/Grid/Pane 类型 |
| `stores/terminalStore.ts`              | 添加 workspace/grid 状态      |

### 保留文件（不修改）

| 文件                                   | 原因                   |
| -------------------------------------- | ---------------------- |
| `components/terminal/Terminal.tsx`     | xterm.js 封装逻辑稳定  |
| `components/terminal/TerminalTabs.tsx` | 暂时保留，逐步替换     |
| `hooks/useTerminal.ts`                 | WebSocket 连接逻辑不变 |

---

## UI 布局草图

```
┌────────────────────────────────────────────────────┐
│ ┌──────┐  ┌────────────────────────────────────┐  │
│ │ WS 1 │  │ Header: ~/projects/foo  ● active   │  │
│ │      │  │         Running: npm run dev        │  │
│ ├──────┤  ├──────────────────┬─────────────────┤  │
│ │ WS 2 │  │                  │                 │  │
│ │      │  │   Terminal #1    │   Terminal #2   │  │
│ ├──────┤  │                  │                 │  │
│ │ WS 3 │  ├──────────────────┼─────────────────┤  │
│ │      │  │                  │                 │  │
│ ├──────┤  │   Terminal #3    │   Terminal #4   │  │
│ │  +   │  │                  │                 │  │
│ └──────┘  └──────────────────┴─────────────────┘  │
└────────────────────────────────────────────────────┘
```

左侧 Tab 栏宽度：**固定 160px**，显示图标 + 名称

---

## 快捷键规格

| 快捷键        | 动作                   | 限制           |
| ------------- | ---------------------- | -------------- |
| `Cmd+D`       | 垂直分割当前 pane      | 最多 4 个 pane |
| `Cmd+Shift+D` | 水平分割当前 pane      | 最多 4 个 pane |
| `Cmd+W`       | 关闭当前 pane terminal | 至少保留 1 个  |
| `Cmd+[`       | 切换到左侧 pane        | -              |
| `Cmd+]`       | 切换到右侧 pane        | -              |
| `Cmd+↑`       | 切换到上方 pane        | -              |
| `Cmd+↓`       | 切换到下方 pane        | -              |
| `Cmd+T`       | 新建工作区 Tab         | -              |
| `Cmd+Shift+W` | 关闭当前工作区 Tab     | -              |

---

## 实现阶段

### Phase 1：类型与数据结构

- 扩展 `types.ts` 添加 Workspace/Grid/Pane 类型
- 扩展 `terminalStore` 添加 workspace 状态管理

### Phase 2：左侧 Tab 栏

- 实现 `TerminalWorkspaceTabs.tsx`
- 修改 `TerminalView.tsx` 为左右布局

### Phase 3：Header

- 实现 `TerminalHeader.tsx`
- 接入 activePane 的 session 信息（cwd、状态、命令）

### Phase 4：网格布局

- 实现 `TerminalGrid.tsx` + `TerminalPane.tsx`
- 支持动态 2×2 网格分割渲染

### Phase 5：快捷键

- 实现 `useTerminalKeyboard.ts`
- 绑定 Cmd+D / Cmd+Shift+D 等全部快捷键

---

## 技术注意事项

1. **xterm.js 复用**：`Terminal.tsx` 组件保持不变，每个 `TerminalPane` 直接使用它
2. **分割线可拖拽**：使用 CSS `resize` 或自定义 drag handle 支持调整 pane 大小
3. **快捷键冲突**：`Cmd+D` 在浏览器中可能有默认行为，需 `preventDefault`
4. **workspace 持久化**：工作区布局可存入 `terminalStore`（内存），刷新后 session 持久、布局可选择性恢复
5. **响应式**：移动端隐藏左侧 Tab 栏，使用 bottom tab 替代

---

_Created: 2026-03-13_

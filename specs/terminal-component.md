# Zen-Swarm 终端组件设计规范

## 概述

为 zen-swarm 构建一个 Web 终端组件，实现真实 Shell 命令的远程执行和输出渲染。用户可以通过 Web 界面操作命令行，数据正常以命令行格式渲染。

**状态: ✅ 已实现 (2026-02-27)**

## 需求摘要

| 维度       | 决策                         |
| ---------- | ---------------------------- |
| 终端类型   | 真实 Shell 终端（bash/zsh）  |
| 前端渲染   | xterm.js（VS Code 终端同款） |
| 后端通信   | WebSocket 实时流（推荐）     |
| 进程管理   | node-pty（伪终端）           |
| 会话持久化 | 不需要，每次新建会话         |
| 多终端支持 | 是，支持同时打开多个终端实例 |
| 集成位置   | 独立的 Terminal 视图         |
| 交互范围   | 执行系统命令 (bash)          |

## 技术方案

### 通信协议选择

**推荐：WebSocket + 自定义消息协议**

理由：

1. 实时双向通信，低延迟
2. 支持二进制数据传输（ANSI 转义序列）
3. 易于实现流式输出
4. 已有 Socket.io 或可以复用现有 WebSocket 基础设施

备选方案：

- **SSE**: 单向通信，不适合终端输入
- **tRPC + 流式**: 需要额外处理流式响应，复杂度高

### 消息协议设计

```typescript
// 客户端 -> 服务端
type ClientMessage =
    | { type: 'input'; sessionId: string; data: string } // 用户输入
    | { type: 'resize'; sessionId: string; cols: number; rows: number } // 终端大小变化
    | { type: 'create'; cols: number; rows: number } // 创建新会话
    | { type: 'destroy'; sessionId: string } // 销毁会话
    | { type: 'list' }; // 列出所有会话

// 服务端 -> 客户端
type ServerMessage =
    | { type: 'output'; sessionId: string; data: string } // 终端输出
    | { type: 'created'; sessionId: string; pid: number } // 会话创建成功
    | { type: 'destroyed'; sessionId: string } // 会话已销毁
    | { type: 'error'; sessionId?: string; message: string } // 错误
    | { type: 'list'; sessions: SessionInfo[] } // 会话列表
    | { type: 'exit'; sessionId: string; code: number }; // 进程退出

interface SessionInfo {
    sessionId: string;
    pid: number;
    createdAt: number;
    cols: number;
    rows: number;
}
```

### 后端架构

```
zen-swarm/src/
├── server/
│   ├── terminal/
│   │   ├── index.ts              # 导出和入口
│   │   ├── TerminalManager.ts    # 终端会话管理器
│   │   ├── TerminalSession.ts    # 单个终端会话
│   │   └── types.ts              # 类型定义
│   └── websocket/
│       └── terminalHandler.ts    # WebSocket 消息处理器
```

### 前端架构

```
zen-swarm/src/frontend/
├── views/
│   └── TerminalView.tsx          # 主视图组件
├── components/terminal/
│   ├── index.ts                  # 导出
│   ├── Terminal.tsx              # xterm.js 封装组件
│   ├── TerminalTabs.tsx          # 多终端标签页
│   ├── TerminalToolbar.tsx       # 工具栏（新建、关闭等）
│   └── types.ts                  # 类型定义
├── hooks/
│   └── useTerminal.ts            # 终端 WebSocket 连接 Hook
└── stores/
    └── terminalStore.ts          # Zustand 状态管理
```

## 界面设计

### 整体布局

```
┌─────────────────────────────────────────────────────────────┐
│  [+] [终端 1 ×] [终端 2 ×] [终端 3 ×]              [⚙️] [×]  │  ← 标签栏
├─────────────────────────────────────────────────────────────┤
│  user@host:~/project $                                       │  ← xterm.js 渲染区
│  $ npm run dev                                               │
│  Server running on http://localhost:3000                     │
│  ...                                                         │
│  ▉                                                           │  ← 光标
└─────────────────────────────────────────────────────────────┘
```

### 功能特性

| 功能           | 描述                        | 优先级 |
| -------------- | --------------------------- | ------ |
| 多终端标签     | 同时打开多个终端实例        | P0     |
| ANSI 颜色渲染  | 支持 ANSI 转义序列          | P0     |
| 终端大小自适应 | 窗口调整时自动 resize       | P0     |
| 复制粘贴       | 支持快捷键复制粘贴          | P0     |
| 新建/关闭终端  | 工具栏操作                  | P0     |
| 命令历史       | 上下箭头浏览历史            | P1     |
| 自动补全       | Tab 键补全（由 shell 提供） | P1     |
| 字体/主题配置  | 可配置终端外观              | P2     |
| 分屏功能       | 水平/垂直分屏               | P2     |

## 实现细节

### 后端 TerminalManager

```typescript
// server/terminal/TerminalManager.ts
import * as pty from 'node-pty';

export class TerminalManager {
    private sessions: Map<string, TerminalSession> = new Map();

    async create(cols: number, rows: number): Promise<SessionInfo> {
        const sessionId = crypto.randomUUID();
        const ptyProcess = pty.spawn(process.env.SHELL || 'bash', [], {
            name: 'xterm-256color',
            cols,
            rows,
            cwd: process.cwd(),
            env: process.env as Record<string, string>,
        });

        const session = new TerminalSession(sessionId, ptyProcess);
        this.sessions.set(sessionId, session);

        return { sessionId, pid: ptyProcess.pid, createdAt: Date.now(), cols, rows };
    }

    write(sessionId: string, data: string): void {
        this.sessions.get(sessionId)?.write(data);
    }

    resize(sessionId: string, cols: number, rows: number): void {
        this.sessions.get(sessionId)?.resize(cols, rows);
    }

    destroy(sessionId: string): void {
        this.sessions.get(sessionId)?.kill();
        this.sessions.delete(sessionId);
    }

    onOutput(sessionId: string, callback: (data: string) => void): void {
        this.sessions.get(sessionId)?.onData(callback);
    }
}
```

### 前端 Terminal 组件

```tsx
// components/terminal/Terminal.tsx
import { useEffect, useRef, useCallback } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';

interface TerminalProps {
    sessionId: string;
    onOutput?: (data: string) => void;
}

export function Terminal({ sessionId, onOutput }: TerminalProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<XTerm | null>(null);
    const socketRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const xterm = new XTerm({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            theme: {
                background: '#1e1e1e',
                foreground: '#d4d4d4',
            },
        });

        const fitAddon = new FitAddon();
        xterm.loadAddon(fitAddon);
        xterm.loadAddon(new WebLinksAddon());

        xterm.open(containerRef.current);
        fitAddon.fit();

        xtermRef.current = xterm;

        // 连接 WebSocket
        const ws = new WebSocket(`${WS_URL}/terminal`);
        socketRef.current = ws;

        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.type === 'output' && msg.sessionId === sessionId) {
                xterm.write(msg.data);
            }
        };

        // 用户输入发送到服务端
        xterm.onData((data) => {
            ws.send(JSON.stringify({ type: 'input', sessionId, data }));
        });

        // 窗口大小变化
        const handleResize = () => fitAddon.fit();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            xterm.dispose();
            ws.close();
        };
    }, [sessionId]);

    return <div ref={containerRef} className="h-full w-full bg-[#1e1e1e] p-2" />;
}
```

### WebSocket 路由集成

```typescript
// server/websocket/terminalHandler.ts
import { WebSocketHandler } from 'bun';
import { TerminalManager } from '../terminal/TerminalManager';

const manager = new TerminalManager();

export const terminalWebSocketHandler: WebSocketHandler = {
    open(ws) {
        // 新连接时发送欢迎消息
        ws.send(JSON.stringify({ type: 'connected' }));
    },

    async message(ws, message) {
        const msg = JSON.parse(message.toString());

        switch (msg.type) {
            case 'create': {
                const session = await manager.create(msg.cols, msg.rows);
                ws.data.sessionId = session.sessionId;
                ws.send(JSON.stringify({ type: 'created', ...session }));

                // 监听输出
                manager.onOutput(session.sessionId, (data) => {
                    ws.send(JSON.stringify({ type: 'output', sessionId: session.sessionId, data }));
                });
                break;
            }

            case 'input':
                manager.write(msg.sessionId, msg.data);
                break;

            case 'resize':
                manager.resize(msg.sessionId, msg.cols, msg.rows);
                break;

            case 'destroy':
                manager.destroy(msg.sessionId);
                ws.send(JSON.stringify({ type: 'destroyed', sessionId: msg.sessionId }));
                break;
        }
    },

    close(ws) {
        if (ws.data.sessionId) {
            manager.destroy(ws.data.sessionId);
        }
    },
};
```

## 依赖项

### 前端

```json
{
    "dependencies": {
        "xterm": "^5.3.0",
        "xterm-addon-fit": "^0.8.0",
        "xterm-addon-web-links": "^0.9.0"
    }
}
```

### 后端

```json
{
    "dependencies": {
        "node-pty": "^1.0.0"
    }
}
```

> ⚠️ **注意**: `node-pty` 是原生模块，需要编译。确保系统有 Python 和编译工具链。

## 安全考虑

1. **权限控制**: 终端功能应限制为授权用户
2. **命令过滤**: 可选配置禁止危险命令
3. **资源限制**: 限制单用户最大终端数量
4. **超时清理**: 空闲会话自动关闭

## 实现计划

### Phase 1: 基础功能 (P0)

1. 后端 TerminalManager + node-pty 集成
2. WebSocket 通信层
3. 前端 xterm.js 组件
4. 单终端基础交互

### Phase 2: 多终端支持 (P0)

1. 多终端标签页 UI
2. 会话管理（创建/销毁）
3. 终端大小同步

### Phase 3: 增强功能 (P1-P2)

1. 命令历史
2. 主题/字体配置
3. 分屏功能

## 路由设计

```
/terminal          → TerminalView (默认打开一个终端)
/terminal/:id      → TerminalView (打开指定终端)
```

## 相关资源

- [xterm.js 文档](https://xtermjs.org/)
- [node-pty 文档](https://github.com/microsoft/node-pty)
- [VS Code 终端实现](https://code.visualstudio.com/docs/terminal/basics)

---

## 实现状态

### ✅ 已完成

| 功能                 | 文件                                                             | 状态 |
| -------------------- | ---------------------------------------------------------------- | ---- |
| 后端 TerminalManager | `zen-swarm/src/services/terminal/TerminalManager.ts`             | ✅   |
| 后端 TerminalSession | `zen-swarm/src/services/terminal/TerminalSession.ts`             | ✅   |
| 后端类型定义         | `zen-swarm/src/services/terminal/types.ts`                       | ✅   |
| WebSocket 处理器     | `zen-swarm/src/api/terminalWebSocket.ts`                         | ✅   |
| 前端 Terminal 组件   | `zen-swarm/src/frontend/components/terminal/Terminal.tsx`        | ✅   |
| 前端 TerminalTabs    | `zen-swarm/src/frontend/components/terminal/TerminalTabs.tsx`    | ✅   |
| 前端 TerminalToolbar | `zen-swarm/src/frontend/components/terminal/TerminalToolbar.tsx` | ✅   |
| 前端 TerminalView    | `zen-swarm/src/frontend/components/terminal/TerminalView.tsx`    | ✅   |
| useTerminal Hook     | `zen-swarm/src/frontend/hooks/useTerminal.ts`                    | ✅   |
| terminalStore        | `zen-swarm/src/frontend/stores/terminalStore.ts`                 | ✅   |
| App Registry 注册    | `zen-swarm/src/frontend/components/app-registry/registry.ts`     | ✅   |

### 实际文件结构

```
zen-swarm/src/
├── services/terminal/
│   ├── index.ts              # 模块导出
│   ├── TerminalManager.ts    # 终端会话管理器（单例模式）
│   ├── TerminalSession.ts    # 单个终端会话（node-pty 封装）
│   └── types.ts              # 类型定义
├── api/
│   └── terminalWebSocket.ts  # WebSocket 消息处理器
└── frontend/
    ├── components/terminal/
    │   ├── index.ts          # 模块导出
    │   ├── Terminal.tsx      # xterm.js 封装（forwardRef）
    │   ├── TerminalTabs.tsx  # 多终端标签页
    │   ├── TerminalToolbar.tsx # 工具栏
    │   ├── TerminalView.tsx  # 主视图组件
    │   └── types.ts          # 前端类型定义
    ├── hooks/
    │   └── useTerminal.ts    # WebSocket 连接 Hook
    └── stores/
        └── terminalStore.ts  # Zustand 状态管理
```

### 使用方式

1. 访问 `http://localhost:8124/ui#/terminal`
2. 点击 Dock 中的 Terminal 图标
3. 工具栏点击"新建"创建新终端
4. 在终端中输入命令并执行

### 待完成功能 (P1-P2)

- [ ] 命令历史记录
- [ ] 主题/字体配置面板
- [ ] 分屏功能
- [ ] 终端会话持久化（可选）
- [ ] 快捷键支持 (Cmd+T/W)

## 已知限制

### ~~Bun 运行时限制~~ ✅ 已修复 (2026-02-27)

之前由于 Bun 运行时下 `node-pty` 的 `onData` 回调不工作，曾使用 `child_process` 作为降级方案。

**现已修复：** 使用 Bun 官方 `Bun.Terminal` API 实现完整 PTY 支持。

```typescript
// Bun 环境下使用官方 API
const terminal = new Bun.Terminal({
    cols: 80,
    rows: 24,
    data(term, data) {
        // 接收终端输出
        const str = new TextDecoder().decode(data);
        callback(str);
    },
});

// 连接到 shell 进程
const proc = Bun.spawn(['/bin/bash'], { terminal });
```

**当前支持：**

- ✅ ANSI 颜色和光标控制
- ✅ 交互式命令（vim, top, less 等）
- ✅ 命令行编辑和 Tab 补全
- ✅ 终端 resize

**运行环境：**

- Bun: 使用 `Bun.Terminal` API（完整 PTY 支持）
- Node.js: 使用 `node-pty`（完整 PTY 支持）
- 其他: 使用 `script` 命令（降级模式）

**相关文件：**

- `zen-swarm/src/services/terminal/TerminalSession.ts` - 包含自动检测和多运行时支持

---

## 架构关键设计

### WebSocket 单例模式

前端使用全局单例 WebSocket 连接，确保多个组件共享同一连接：

```typescript
// useTerminal.ts
let globalWs: WebSocket | null = null;
const outputCallbacksBySession = new Map<string, Set<(data: string) => void>>();

// 引用计数管理连接生命周期
let connectionRefCount = 0;
```

### 输出缓冲区机制

解决 xterm 初始化与 WebSocket 消息的时序问题：

```typescript
// 消息到达时，如果回调未注册，先缓冲
const outputBufferBySession = new Map<string, string[]>();

// 注册回调时，立即刷新缓冲区
function flushBuffer(sessionId: string, callback: (data: string) => void) {
    const buffer = outputBufferBySession.get(sessionId);
    if (buffer?.length) {
        buffer.forEach((data) => callback(data));
        buffer.length = 0;
    }
}
```

### 终端组件初始化时序

确保在 xterm 初始化后立即注册输出回调：

```typescript
// Terminal.tsx
useEffect(() => {
    const xterm = new XTerm({ ... });
    xterm.open(containerRef.current);
    xtermRef.current = xterm;

    // 立即注册（触发缓冲区刷新）
    const unsubscribe = onOutput(sessionId, (data) => {
        xterm.write(data);
    });

    setIsReady(true);  // 之后才设置 ready
}, [sessionId, onOutput]);
```

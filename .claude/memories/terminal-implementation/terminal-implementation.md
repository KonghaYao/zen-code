---
name: terminal-implementation
description:
    Web 终端系统完整实现：包含两种后端实现（Bun.Terminal 和 node-pty）、前端 WebSocket
    单例模式、输出缓冲区机制、多终端标签页支持、xterm.js 渲染。解决了多连接竞争、消息时序、Bun
    运行时兼容性等问题。适用于需要 Web 端真实 Shell 访问的场景。
tags:
    - terminal
    - websocket
    - node-pty
    - xterm
    - bun
    - bun-compatibility
    - architecture
category: architecture
created: 2025-01-25
last_updated: 2026-02-27
priority: high
context_scope: project
---

# Web 终端系统完整实现

## 一、两种后端实现

### 1. Bun.Terminal 实现（推荐）

#### 重构历程

将 `TerminalSession.ts` 从内联配置方式重构为使用 `new Bun.Terminal()` 标准方式：

```typescript
// 旧实现：内联配置
const proc = Bun.spawn(['/bin/bash'], {
    terminal: { cols, rows, data(...) {...} }
});

// 新实现：官方 API
this.bunTerminal = new Bun.Terminal({
    cols, rows,
    data(_terminal, data) {
        const str = new TextDecoder().decode(data);
        self.outputCallbacks.forEach(cb(cb(str)));
    },
});

const proc = Bun.spawn(['/bin/bash'], {
    terminal: this.bunTerminal,
});
```

**优势**：

- 更好地控制 terminal 生命周期
- 支持 `await using` 自动清理
- 代码更接近官方文档推荐模式
- 直接使用 `Bun.Terminal` 类型，无需自定义接口

**相关文件**：`src/services/terminal/TerminalSession.ts:63-120`

### 2. node-pty 实现（完整 PTY 支持）

#### 兼容性问题与降级方案

**问题**：Bun 运行时与 node-pty 的回调机制不兼容，`pty.onData/onExit` 不会被触发

**降级实现**：

```typescript
// 尝试使用 node-pty
try {
    const pty = await import('node-pty');
    this.ptyProcess = pty.default.spawn('/bin/zsh', [], {
        name: 'xterm-256color',
        cols,
        rows,
        cwd,
        env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor' } as any,
        useConpty: false,
        forceWindowsConpty: false,
        experimentalUseConpty: false,
    });
} catch {
    // Bun 下降级到 child_process（失去 PTY 功能）
    const { spawn } = await import('child_process');
    this.ptyProcess = spawn('/bin/zsh', [], { cwd, env: process.env as any });
}
```

**推荐运行方式**：使用 Node.js 获得完整 PTY 支持

```bash
node --experimental-strip-types src/server.ts
```

#### 架构设计

**后端服务**：

- `services/terminal/TerminalManager.ts`: 会话管理，支持创建/销毁/输入/调整大小
- `services/terminal/TerminalSession.ts`: 封装 node-pty 或 child_process
- `api/terminalWebSocket.ts`: WebSocket 消息处理器

---

## 二、前端实现

### 1. WebSocket 单例模式

#### 问题根因

每个组件调用 `useTerminal()` 都创建独立 WebSocket 实例，导致：

- 多个 WebSocket 实例竞争
- `onOutput` 回调注册到不同实例
- 消息分发混乱

#### 解决方案：全局单例 + 引用计数

```typescript
// 全局 WebSocket 单例
let globalWs: WebSocket | null = null;

// 引用计数管理连接生命周期
let connectionRefCount = 0;

// 全局输出回调集合（按 sessionId 分组）
const outputCallbacksBySession = new Map<string, Set<(output: string) => void>>();

// 输出缓冲区（解决初始输出丢失问题）
const outputBuffers = new Map<string, string[]>();
```

**关键机制**：

1. **引用计数**：第一个调用者连接，最后一个调用者断开
2. **回调注册**：支持多个组件同时订阅同一 session 的输出
3. **输出缓冲区**：在 xterm 初始化前缓冲消息，初始化后刷新

### 2. 组件架构

**文件**：`src/frontend/components/terminal/`

- `Terminal.tsx`: xterm.js 封装，支持 ANSI 颜色
- `TerminalTabs.tsx`: 多终端标签页，支持重命名
- `TerminalToolbar.tsx`: 工具栏（新建/关闭/清空/重连）
- `TerminalView.tsx`: 主视图，整合所有组件
- `hooks/useTerminal.ts`: WebSocket 连接管理，自动重连
- `stores/terminalStore.ts`: Zustand 状态管理

### 3. 时序控制：解决初始输出丢失

**问题**：初始输出在 xterm 初始化前到达，导致消息丢失

**解决方案**：

```typescript
// 将 onOutput 回调注册移到 xterm 初始化后立即执行（setIsReady 之前）
useEffect(() => {
    if (!terminalRef.current || isReady) return;

    terminalRef.current.open(containerRef.current!);

    // 关键：立即注册回调并刷新缓冲区
    registerOutputCallback(sessionId, (output) => {
        terminalRef.current?.write(output);
    });

    // 刷新缓冲的消息
    const buffered = outputBuffers.get(sessionId) || [];
    buffered.forEach((msg) => terminalRef.current?.write(msg));
    outputBuffers.delete(sessionId);

    setIsReady(true);

    return () => {
        // 清理回调
        unregisterOutputCallback(sessionId);
    };
}, [sessionId, isReady]);
```

### 4. WebSocket 消息协议

#### 客户端 → 服务端

- `{ type: 'create', cols, rows, cwd? }`: 创建新会话
- `{ type: 'input', sessionId, data }`: 用户输入
- `{ type: 'resize', sessionId, cols, rows }`: 调整终端大小
- `{ type: 'destroy', sessionId }`: 销毁会话
- `{ type: 'list' }`: 列出所有会话

#### 服务端 → 客户端

- `{ type: 'output', sessionId, data }`: 终端输出
- `{ type: 'created', session }`: 会话创建成功
- `{ type: 'destroyed', sessionId }`: 会话已销毁
- `{ type: 'error', sessionId?, message }`: 错误信息
- `{ type: 'exit', sessionId, code }`: 进程退出

---

## 三、集成与部署

### 1. Hono 路由拦截修复

**问题**：WebSocket 连接返回 426 Upgrade Required

**原因**：Hono 的 app.fetch 先于 Bun 的 websocket 处理器执行

**解决**：在 server.ts 添加自定义 fetch 函数

```typescript
fetch(req) {
    // 优先处理 WebSocket 升级请求
    if (req.url.endsWith('/ws/terminal')) {
        // Bun 的 websocket 处理器会自动处理 upgrade 请求
        return app.fetch(req);
    }
    return app.fetch(req);
}
```

**位置**：`src/server.ts:30-40`

### 2. App Registry 注册

```typescript
// components/app-registry/registry.ts
{
    id: 'terminal',
    name: 'Terminal',
    icon: '⌘',
    description: 'Web terminal',
    viewComponent: TerminalView,
    keyboardShortcut: 'Cmd+6',
}
```

### 3. DockLayout 集成

**文件**：`src/frontend/layouts/DockLayout.tsx`

添加到 activeApp 白名单

### 4. 访问路径

```
http://localhost:8124/ui#/terminal
```

---

## 四、运行时选择与限制

### Bun 运行时

- **实现方式**：Bun.Terminal 官方 API
- **优势**：原生支持，性能更好
- **限制**：无特殊限制

### Node.js 运行时

- **实现方式**：node-pty + child_process 降级
- **优势**：完整的 PTY 支持
- **已知限制（Bun 运行时）**：
    - 不支持 ANSI 颜色渲染
    - 不支持交互式命令（vim、top 等）
    - 不支持 Tab 补全
- **建议**：使用 Node.js 运行以获得完整 PTY 功能

---

## 五、设计决策总结

| 决策                  | 理由                               |
| --------------------- | ---------------------------------- |
| Bun.Terminal 官方 API | 更好的控制力，接近官方推荐         |
| WebSocket 全局单例    | 避免多连接竞争，统一管理输出分发   |
| 引用计数              | 优雅管理连接生命周期               |
| 输出缓冲区            | 解决初始输出丢失的时序问题         |
| node-pty 降级         | 兼容 Bun 运行时，保留完整 PTY 选项 |
| Hono fetch 优先处理   | 解决 WebSocket 升级请求拦截        |

---

## 相关文件

### 后端实现

- `src/services/terminal/TerminalManager.ts` - 会话管理器
- `src/services/terminal/TerminalSession.ts` - PTY 封装
- `src/api/terminalWebSocket.ts` - WebSocket 消息处理
- `src/server.ts` - Hono fetch 路由拦截修复

### 前端实现

- `src/frontend/components/terminal/Terminal.tsx` - xterm.js 封装
- `src/frontend/components/terminal/TerminalTabs.tsx` - 多标签页
- `src/frontend/components/terminal/TerminalToolbar.tsx` - 工具栏
- `src/frontend/components/terminal/TerminalView.tsx` - 主视图
- `src/frontend/hooks/useTerminal.ts` - WebSocket 连接管理
- `src/frontend/stores/terminalStore.ts` - Zustand 状态管理

### 集成文件

- `src/frontend/components/app-registry/registry.ts` - 应用注册
- `src/frontend/layouts/DockLayout.tsx` - Dock 布局集成

# zen-swarm Terminal 持久化方案

> 创建时间: 2026-03-01状态: ✅ Completed

## 1. 背景与目标

### 问题描述

当前 zen-swarm 的 Terminal 实现：

- 浏览器关闭 → Terminal 会话丢失
- 网络断联 → Terminal 会话丢失
- 用户需要手动重新执行命令

### 目标

```
关闭浏览器 ──→ 进程继续执行 ──→ 重连后可恢复
网络断联   ──→ 进程继续执行 ──→ 重连后可恢复
用户删除   ──→ 进程被杀死  ──→ 会话彻底清除
```

## 2. 实现架构

### 2.1 整体架构

```
┌──────────────────────────────────────────────────────────────┐
│                         zen-swarm                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Frontend (React)          Backend (Bun)                    │
│  ┌────────────────┐        ┌────────────────────────────┐   │
│  │ TerminalView   │        │ TerminalManager (单例)     │   │
│  │ - TerminalTabs │  WS    │ - Map<sessionId, Session>  │   │
│  │ - Terminal     │ ←────→ │ - create/kill/attach       │   │
│  │ - 重连恢复     │        │ - getHistory()             │   │
│  └────────────────┘        └────────────────────────────┘   │
│                                        │                     │
│                                        ▼                     │
│                              ┌──────────────────────┐        │
│                              │ TerminalSession      │        │
│                              │ - node-pty/IPty      │        │
│                              │ - RingBuffer (10k)   │        │
│                              │ - getHistory()       │        │
│                              └──────────────────────┘        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 实现文件

**后端**:

- `src/services/terminal/TerminalSession.ts` - PTY 进程封装 + RingBuffer 输出缓存
- `src/services/terminal/TerminalManager.ts` - 会话管理器单例
- `src/services/terminal/types.ts` - 类型定义（包含 `attach` 消息）
- `src/api/terminalWebSocket.ts` - WebSocket 处理（不再自动销毁）

**前端**:

- `src/frontend/hooks/useTerminal.ts` - WebSocket hook + 重连恢复
- `src/frontend/stores/terminalStore.ts` - Zustand 状态管理
- `src/frontend/components/terminal/Terminal.tsx` - xterm.js + 重连恢复
- `src/frontend/components/terminal/TerminalTabs.tsx` - 标签页（关闭=销毁）
- `src/frontend/components/terminal/TerminalView.tsx` - 主视图

### 2.3 关键变更

#### 2.3.1 TerminalSession - Ring Buffer 输出缓存

```typescript
// RingBuffer 实现 - 固定大小的循环缓冲区
class RingBuffer<T> {
    private buffer: (T | undefined)[];
    private head = 0;
    private count = 0;

    constructor(private capacity: number) { ... }
    push(item: T): void { ... }
    getAll(): T[] { ... }
}

export class TerminalSession {
    private outputBuffer: RingBuffer<string>; // 10k 行
    private maxBufferSize = 10000;

    // 所有输出都缓存
    this.ptyProcess.onData((data) => {
        this.outputBuffer.push(data); // 新增
        this.outputCallbacks.forEach((cb) => cb(data));
    });

    // 新增方法
    getHistory(): string[] {
        return this.outputBuffer.getAll();
    }
}
```

#### 2.3.2 TerminalManager - 会话管理

```typescript
export class TerminalManager {
    private sessions: Map<string, TerminalSession> = new Map();

    // 新增方法
    getHistory(sessionId: string): string[] | null {
        const session = this.sessions.get(sessionId);
        return session ? session.getHistory() : null;
    }

    hasSession(sessionId: string): boolean {
        return this.sessions.has(sessionId);
    }
}
```

#### 2.3.3 terminalWebSocket - 不再自动销毁

```typescript
// 新增消息类型
type TerminalClientMessage =
    | { type: 'attach'; sessionId: string } // 重连附加
    | ...

type TerminalServerMessage =
    | { type: 'attached'; session: TerminalSessionInfo; history: string[] }
    | { type: 'history'; sessionId: string; history: string[] }
    | ...

// 关键变更：attach 命令
case 'attach': {
    const session = manager.getSession(msg.sessionId);
    if (!session) { /* 错误 */ return; }

    // 获取历史输出
    const history = manager.getHistory(msg.sessionId) ?? [];

    // 发送附加成功 + 历史输出
    ws.send({ type: 'attached', session, history });

    // 继续监听后续输出
    manager.onOutput(msg.sessionId, (data) => { ... });
}

// 关键变更：连接关闭时不再销毁会话
export function handleTerminalClose(ws) {
    // 断联时不销毁会话，会话继续在后台运行
    console.log('Connection closed, sessions preserved');
}
```

#### 2.3.4 前端 - 重连恢复

```typescript
// useTerminal.ts
const attachSession = (sessionId: string, onHistory?: (history: string[]) => void) => {
    if (onHistory) {
        historyCallbacks.set(sessionId, onHistory);
    }
    send({ type: 'attach', sessionId });
};

// 处理 attached 消息
case 'attached': {
    // 检查会话是否已存在（list 消息可能已经添加过了）
    const currentSessions = useTerminalStore.getState().sessions;
    const sessionExists = currentSessions.some(s => s.sessionId === msg.session.sessionId);

    if (!sessionExists) {
        storeAddSession?.(msg.session);
    }

    const cb = historyCallbacks.get(msg.session.sessionId);
    if (cb) cb(msg.history); // 回调写入 xterm
}

// 处理 list 消息（重连时服务端发送所有会话）
case 'list': {
    storeSyncSessions?.(msg.sessions); // 同步到本地状态
}

// Terminal.tsx - 重连恢复
useEffect(() => {
    if (wsStatus === 'connected' && !hasAttachedRef.current) {
        hasAttachedRef.current = true;
        attachSession(sessionId, (history) => {
            xtermRef.current?.clear();
            history.forEach(line => xtermRef.current?.write(line));
        });
    }
}, [wsStatus, sessionId]);
```

## 3. 数据流

### 3.1 正常流程

```
1. 用户打开 Terminal → createSession()
2. 服务端创建 TerminalSession → PTY 进程启动
3. 输出 → RingBuffer 缓存 + WebSocket 推送
4. 前端 xterm.js 渲染
```

### 3.2 断联重连流程

```
1. 网络断开 → WebSocket onclose
2. 服务端：会话保留，进程继续运行，输出继续缓存
3. 前端：显示"终端服务未连接"，自动重连
4. 重连成功 → 服务端发送 list（所有会话）
5. 前端 syncSessions() → 恢复会话列表
6. Terminal 组件 attachSession() → 获取历史输出
7. xterm 清屏 + 写入历史 → 用户看到之前的内容
8. 继续监听实时输出
```

### 3.3 用户删除流程

```
1. 用户点击关闭按钮 → destroySession(sessionId)
2. 发送 { type: 'destroy', sessionId }
3. 服务端 manager.destroy() → session.kill() → 杀死 PTY 进程
4. 发送 { type: 'destroyed', sessionId }
5. 前端 removeSession() → 从列表移除
```

## 4. 性能与安全

### 4.1 内存控制

| 组件       | 内存限制  | 策略                      |
| ---------- | --------- | ------------------------- |
| RingBuffer | 10,000 行 | 超出自动丢弃最旧          |
| 单个会话   | ~1-2MB    | 估算（10k 行 × 100 字符） |
| 最大会话数 | 10        | TerminalManager 限制      |

### 4.2 安全考虑

- 无权限控制（当前单用户）
- 无持久化（服务重启丢失）
- 无会话过期（需手动删除）

## 5. 关键问题与修复

### 5.1 问题：点击新建终端出现两个高亮标签

**现象**：点击"新建终端"按钮后，会在标签栏显示两个相同会话的标签，且都高亮显示。

**根本原因**：WebSocket 连接建立后，服务端同时发送 `list` 消息（包含所有会话）和 `created`
消息，导致同一个会话被添加到 store 两次。

**解决方案**：

1. **terminalStore.addSession** - 添加重复检查

```typescript
addSession: (session: TerminalSessionInfo) => {
    set((state) => {
        // 避免重复添加同一会话
        if (state.sessions.some((s) => s.sessionId === session.sessionId)) {
            return state;
        }
        // ... 添加会话逻辑
    });
};
```

2. **useTerminal.ts attached 消息处理** - 检查会话是否已存在

```typescript
case 'attached': {
    const currentSessions = useTerminalStore.getState().sessions;
    const sessionExists = currentSessions.some(s => s.sessionId === msg.session.sessionId);

    if (!sessionExists) {
        storeAddSession?.(msg.session);
    }
    // ...
}
```

### 5.2 问题：输入和输出字符重复显示

**现象**：在终端输入字符或查看输出时，字符会重复显示，但发送到后端的数据是正确的。

**根本原因**：`TerminalManager.onOutput` 方法允许同一 WebSocket 多次注册输出监听器，导致输出被推送到前端多次。

**解决方案**：实现 WebSocket 独占监听模式

```typescript
// TerminalManager
private outputUnsubscribes: Map<string, Map<unknown, () => void>> = new Map();

onOutput(sessionId: string, ws: unknown, callback: (data: string) => void): (() => void) | undefined {
    // 如果该 WebSocket 已经有监听器，先取消它
    const existingUnsubscribe = wsUnsubscribes.get(ws);
    if (existingUnsubscribe) {
        existingUnsubscribe();
    }

    // 注册新的监听器
    const unsubscribe = session.onOutput(callback);
    wsUnsubscribes.set(ws, unsubscribe);

    return () => {
        unsubscribe?.();
        wsUnsubscribes.delete(ws);
    };
}
```

**调用方式变更**：

```typescript
// terminalWebSocket.ts
manager.onOutput(session.sessionId, ws, (data: string) => {
    ws.send({ type: 'output', sessionId: session.sessionId, data });
});
```

## 6. 测试场景

- [x] 关闭浏览器 → 重连后恢复
- [x] 网络断开 → 重连后恢复
- [x] 用户删除 → 进程被杀死
- [x] 多终端切换
- [x] 长时间运行（输出超过 10k 行）
- [x] 新建终端不会出现重复标签
- [x] 输入和输出字符不重复显示

## 7. 未来扩展

- [ ] 持久化到 SQLite（服务重启后可恢复）
- [ ] 会话录制与回放
- [ ] 多用户权限控制
- [ ] tmux 后端选项（更可靠）
- [ ] 会话过期自动清理

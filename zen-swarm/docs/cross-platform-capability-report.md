# zen-swarm 内存泄漏分析报告

> 生成时间：2026-03-01分析范围：`zen-swarm/src/` 结论：共发现 **3 个高危**、**5 个中危**、**4 个低危**内存问题

---

## 总结

zen-swarm 内存暴涨的**核心根因**有两类：

1. **事件监听器未正确清理**（最严重，尤以电池 API 的 useEffect 写法错误）
2. **日志/数据无上限累积**（monitorStore 日志数组无限增长）

---

## 高危问题

### [HIGH-1] 电池 API 事件监听器永久泄漏

**文件**: `src/frontend/hooks/useSystemStatus.ts:124-162`

**问题**: `getBattery()` 是异步调用，cleanup 函数在 `.then()` 内部返回，但 `useEffect`
只能捕获**同步返回**的 cleanup 函数。`.then()` 的返回值被完全忽略，导致四个电池事件监听器永远无法被移除。

```typescript
// 当前写法 - cleanup 函数实际上被丢弃
useEffect(() => {
    if ('getBattery' in navigator) {
        (navigator as any).getBattery().then((battery: any) => {
            // ...
            battery.addEventListener('levelchange', updateBattery);
            // ...
            return () => {           // ← 这个 return 是 .then() 的返回值，
                battery.removeEventListener(...); //   useEffect 根本拿不到它
            };
        });
        // useEffect 实际返回 undefined，没有任何 cleanup
    }
}, []);
```

每次该组件挂载（页面刷新、热更新、组件重装），就会再增加 4 个无法清理的监听器，持续累积。

**修复方案**:

```typescript
useEffect(() => {
    if (!('getBattery' in navigator)) {
        setSystemStatus((prev) => ({ ...prev, battery: DEFAULT_BATTERY }));
        return;
    }
    let battery: any = null;
    let mounted = true;

    (navigator as any).getBattery().then((b: any) => {
        if (!mounted) return; // 组件已卸载，不注册
        battery = b;
        const update = () => {
            /* ... */
        };
        update();
        battery.addEventListener('levelchange', update);
        battery.addEventListener('chargingchange', update);
        battery.addEventListener('chargingtimechange', update);
        battery.addEventListener('dischargingtimechange', update);
    });

    return () => {
        mounted = false;
        if (battery) {
            battery.removeEventListener('levelchange', update);
            // ...
        }
    };
}, []);
```

---

### [HIGH-2] monitorStore 日志数组无限增长

**文件**: `src/frontend/stores/monitorStore.ts:186-193`

**问题**: `appendLog`
每次调用都直接 push 新日志行，没有任何大小上限。MonitorView 每 2 秒刷新一次进程列表，如果进程持续产生日志，`logs[pid]`
数组会无限增长，最终撑爆内存。

```typescript
appendLog: (pid, line) => {
    set((state) => ({
        logs: {
            ...state.logs,
            [pid]: [...(state.logs[pid] || []), line],  // ← 无限 push，无上限
        },
    }));
},
```

同时 `logs` 对象使用进程 PID 作为 key，历史上存在过的所有进程日志都不会被自动清理——即使进程已结束。

**修复方案**:

```typescript
const MAX_LOG_LINES = 500;

appendLog: (pid, line) => {
    set((state) => {
        const existing = state.logs[pid] || [];
        const updated = [...existing, line];
        // 超出限制时丢弃最旧的行
        const trimmed = updated.length > MAX_LOG_LINES
            ? updated.slice(updated.length - MAX_LOG_LINES)
            : updated;
        return { logs: { ...state.logs, [pid]: trimmed } };
    });
},
```

---

### [HIGH-3] 全局 Terminal Hook Map 无限积累

**文件**: `src/frontend/hooks/useTerminal.ts:27-42`

**问题**: 模块顶层定义了三个全局 Map，它们随会话数量线性增长：

```typescript
// 模块级全局变量（应用整个生命周期内不会被 GC）
const outputCallbacksBySession = new Map<string, Set<(data: string) => void>>();
const outputBufferBySession = new Map<string, string[]>();
const historyCallbacks = new Map<string, (history: string[]) => void>();
```

**具体泄漏路径**：

1. **`historyCallbacks`（第 42 行）**：当 `attachSession`
   被调用后注册回调，若 WebSocket 异常断开且未重连，这个回调永远不会被触发也不会被清理。
2. **`outputBufferBySession`**：虽然单条缓冲限制为 100 条，但如果会话不被正常销毁（`storeRemoveSession`
   未触发），对应 key 永远留在 Map 中。
3. **会话销毁依赖服务端消息**：若 WebSocket 意外断开，服务端的 `session_destroyed`
   消息不会到达，cleanup 逻辑（第 136-138 行）永远不执行。

---

## 中危问题

### [MED-1] MonitorView 定时器依赖不稳定导致重复注册

**文件**: `src/frontend/views/MonitorView.tsx:43-50`

**问题**: `refreshProcesses` 来自 Zustand store，若其引用不稳定（每次 store 更新都产生新引用），`useEffect`
会反复清理旧 interval 并创建新 interval，在快速状态变更期间会短时间内出现多个并发刷新请求。

```typescript
useEffect(() => {
    refreshProcesses();
    const interval = setInterval(() => {
        refreshProcesses();
    }, 2000);
    return () => clearInterval(interval);
}, [viewMode, refreshProcesses]); // ← refreshProcesses 引用变化 = interval 重建
```

**影响**: 并发的多个 interval 会同时发起 `/api/trpc/monitor.*` 请求，导致服务端负载急剧上升并造成前端状态更新风暴。

---

### [MED-2] FinderListView 列拖拽监听器可能泄漏

**文件**: `src/frontend/components/finder/Views/FinderListView.tsx:59-72`

**问题**: 每次列头 `mousedown` 都在 `document` 上注册 `mousemove` 和 `mouseup`
监听。如果用户快速点击多列或在拖拽中途切换页面，`mouseup` 未触发，监听器无法自清理：

```typescript
const handleMouseDown = (e: MouseEvent) => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp); // ← mouseup 是自清理触发器
    // 若 mouseup 未触发（如焦点丢失），监听器永久留存
};
```

---

### [MED-3] FinderView 拖拽选择监听器同类问题

**文件**: `src/frontend/views/Finder/FinderView.tsx:377-378`

与 MED-2 相同模式，`document` 上的 `mousemove`/`mouseup` 可能因焦点切换未被清理。多个 Finder 窗口同时存在时问题叠加。

---

### [MED-4] TerminalManager 全局单例无自动清理

**文件**: `src/services/terminal/TerminalManager.ts:184-203`

**问题**: `getTerminalManager()` 返回进程级单例，`sessions` Map 和 `outputUnsubscribes`
双层 Map 随终端会话增加而增长。虽然提供了 `destroyAll()`，但：

1. 没有在服务器关闭（`SIGTERM`/`SIGINT`）时被调用的保证
2. 每个 `TerminalSession` 持有一个 `node-pty` 子进程，若未销毁则成为僵尸进程
3. `outputUnsubscribes` 中的回调集合在 WebSocket 断开但会话未销毁时会积累空引用

---

### [MED-5] Select 组件键盘事件监听依赖变化触发重复注册

**文件**: `src/frontend/components/ui/Select.tsx:45-97`

**问题**: `keydown` 处理的 `useEffect` 依赖
`[isOpen, highlightedIndex, options, onChange]`，每次用户在下拉中移动高亮项（`highlightedIndex` 变化），都会：

1. 执行旧 cleanup（removeEventListener）
2. 注册新监听器（addEventListener）

在快速键盘操作时，这会产生大量短期监听器注册/注销，增加 GC 压力。

---

## 低危问题

### [LOW-1] DockContainer 键盘监听器因 onAppChange 不稳定重复注册

**文件**: `src/frontend/components/dock/DockContainer.tsx:136-149`

`onAppChange` 是从父组件传入的回调，若父组件未用 `useCallback`
包装，每次渲染都产生新函数引用，导致 keydown 监听反复卸载/重装。虽然旧的会被 cleanup，但在高频状态更新时会短暂出现监听空窗期。

---

### [LOW-2] useSystemStatus updateNetworkStatus 依赖循环

**文件**: `src/frontend/hooks/useSystemStatus.ts:94-183`

`updateNetworkStatus` 用 `useCallback(fn, [])`
创建（依赖数组为空，稳定），本身不会引发问题。但若未来有人在依赖数组中加入非稳定值，整个网络监听的注册/清理周期就会出现问题。当前是低风险，属于防御性提醒。

---

### [LOW-3] CronLogList 日期分组每次重新计算

**文件**: `src/frontend/components/cron/CronLogList.tsx:73-91`

`groupLogsByDate` 在每次 render 时重新执行，没有
`useMemo`。当 cron 日志条数较多时（数百条），每次父组件 re-render 都会产生新对象，增加 GC 压力。

---

### [LOW-4] Modal 组件 keydown 使用陈旧闭包

**文件**: `src/frontend/components/Modal.tsx:36-71`

若 `handleKeyDown` 内部引用了组件 props 但 `useEffect`
依赖数组不完整，可能捕获到陈旧的回调引用，导致关闭操作调用错误版本的 `onClose`。

---

## 优先修复顺序

| 优先级 | 问题 ID | 文件                 | 影响描述                        |
| ------ | ------- | -------------------- | ------------------------------- |
| P0     | HIGH-2  | `monitorStore.ts`    | 日志无上限，长时间运行必然 OOM  |
| P0     | HIGH-1  | `useSystemStatus.ts` | 每次挂载泄漏 4 个永久监听器     |
| P1     | HIGH-3  | `useTerminal.ts`     | 终端会话泄漏，持有 pty 进程引用 |
| P1     | MED-4   | `TerminalManager.ts` | 未销毁的 pty 子进程成为僵尸进程 |
| P2     | MED-1   | `MonitorView.tsx`    | 并发 interval 引发请求风暴      |
| P2     | MED-2/3 | Finder 组件          | 多窗口场景下监听器快速积累      |
| P3     | MED-5   | `Select.tsx`         | 高频键盘操作增加 GC 压力        |
| P4     | LOW-1~4 | 各组件               | 轻微性能影响                    |

---

## 检测工具建议

1. **Chrome DevTools Memory → Heap Snapshot**：对比操作前后快照，过滤 `Map`/`Set`/`EventListener` 增长
2. **Chrome DevTools Performance → Event Listeners**：查看 `document`/`window` 上的监听器数量
3. **Node.js `--inspect`**：监控服务端 `TerminalManager` 进程占用
4. **`process.memoryUsage()`**：在 `/health` 端点暴露 heap 统计，配合监控告警

---

_报告由 Claude Code 自动分析生成，建议结合实际运行时 profiling 数据验证各问题的实际影响权重。_

# Zen Swarm 前端优化建议

**涉及文件**: `frontend/stores/finder.ts`, `frontend/layouts/DockLayout.tsx`, `frontend/views/`, `frontend/components/`

---

## 1. Finder Store 单文件 990 行问题

### 当前状态

`stores/finder.ts` 是一个包含以下内容的单文件：

- 11 个状态域（File Data、View Options、Selection、Navigation、Column View、Sidebar、Preview/Inspector、Dialogs、Context
  Menu、Drag & Drop、Search）
- 850+ 行的方法实现
- 工具函数（`sortItems`, `formatFileSize`, `formatDate`, `getFileKind`）全部混在同一文件

### 问题

1. **可维护性**: 新增功能难以定位修改位置
2. **测试困难**: 无法单独测试 Selection 逻辑而不引入整个 Store
3. **代码审查**: 990 行 PR diff 难以审查
4. **Set 序列化**: 存储的 `selectedPaths: Set<string>` 无法被 `JSON.stringify` 正确处理，Zustand
   persist 会将其序列化为空对象 `{}`，导致 localStorage 恢复后选择状态丢失

### 建议：按域拆分 Store

```
stores/finder/
├── index.ts          # 合并导出，保持外部 API 不变
├── files.ts          # 文件数据 + 加载逻辑
├── view-options.ts   # 视图设置（持久化）
├── selection.ts      # 选择状态（Set → Array 处理序列化）
├── navigation.ts     # 导航历史
├── sidebar.ts        # 侧边栏（持久化）
├── search.ts         # 搜索状态
└── utils.ts          # sortItems, formatFileSize 等纯函数
```

**Set 序列化修复**（可立即修复，不需重构）:

```typescript
// persist 的 partialize 中将 Set 转换为 Array
partialize: (state) => ({
    viewOptions: state.viewOptions,
    selectedPaths: [...state.selectedPaths], // Set → Array
    // ...
}),
// 在 onRehydrateStorage 中还原
onRehydrateStorage: () => (state) => {
    if (state && Array.isArray(state.selectedPaths)) {
        state.selectedPaths = new Set(state.selectedPaths);
    }
}
```

---

## 2. macOS 专属功能未做平台适配

Finder 侧边栏默认包含 macOS 专属路径：

```typescript
// finder.ts:58-64
{ id: 'airdrop',      path: 'airdrop://',     ... },
{ id: 'icloud-drive', path: 'icloud://',       ... },
{ id: 'applications', path: '/Applications',  ... },
{ id: 'desktop',      path: '~/Desktop',       ... },
```

该应用运行在服务器上（目标是多平台 Bun），这些 macOS 路径在 Linux 服务器上完全无效。`~/Desktop`
在无桌面的 Linux 服务器上不存在。

**建议**: 在初始化时根据服务端操作系统动态生成默认收藏，或从 `/api/trpc/workspaces`
加载 Workspace 列表作为收藏项，替代硬编码的 macOS 路径。

---

## 3. 前端没有错误边界

61 个 `.tsx` 文件中没有发现 React `ErrorBoundary`。任何组件内的未捕获错误会导致整个 `DockLayout` 白屏崩溃。

**建议**: 至少在以下位置增加 ErrorBoundary：

- 每个 `AppWindow`（Chat、Config、Finder、SM 等各自隔离）
- `TRPCProvider` 下方（捕获 tRPC 查询错误）

---

## 4. DockLayout 中的 Suspense 边界

```typescript
// 推断自 DockLayout.tsx
<Suspense fallback={<LoadingSpinner />}>
    {currentApp}
</Suspense>
```

当前 Suspense 包裹整个 App 区域，如果 Finder 加载慢，整个窗口区域都会显示 loading。

**建议**: 每个 App 视图单独设置 Suspense boundary，使各应用懒加载互不影响。

---

## 5. 类型定义分散

前端类型定义存放位置不一致：

- `frontend/types/finder.ts` - Finder 专用类型
- 部分类型直接在组件文件中内联定义
- tRPC 推断类型在各组件中重复使用 `RouterOutputs['xxx']['yyy']`

**建议**: 建立 `frontend/types/api.ts`，集中导出常用 tRPC 推断类型：

```typescript
// frontend/types/api.ts
import type { RouterOutputs } from '../providers/TRPCProvider';

export type Agent = RouterOutputs['agents']['list'][0];
export type CronTask = RouterOutputs['cron']['list'][0];
export type Provider = RouterOutputs['providers']['list'][0];
```

---

## 6. Cron 相关 UI 问题

### 日志轮询策略不明确

`CronLogItem` 组件展示执行日志，但对于 `status = 'running'` 的日志，组件需要持续更新。当前没有看到 `refetchInterval`
配置。

**建议**: 对 `running`/`queued` 状态的任务设置 2 秒刷新：

```typescript
const { data: logs } = trpc.cron.getLogs.useQuery(
    { taskId },
    {
        refetchInterval: hasRunningLogs ? 2000 : false,
    },
);
```

### 手动触发后无状态提示

`triggerManually` 返回 `logId` 后，前端需要跳转到日志视图，但这个导航逻辑是否已实现不确定。

---

## 7. 终端 WebSocket 重连逻辑

`TerminalView.tsx` 通过 WebSocket 连接 `/ws/terminal`。当服务器重启时，WebSocket 连接会断开，用户需要手动刷新页面。

**建议**: 在 `Terminal.tsx` 中实现指数退避重连：

```typescript
// 伪代码
let reconnectDelay = 1000;
ws.onclose = () => {
    setTimeout(() => {
        reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
        reconnect();
    }, reconnectDelay);
};
ws.onopen = () => {
    reconnectDelay = 1000;
}; // 重置
```

---

## 8. 构建产物优化

当前 Vite 构建未见明确的代码分割配置。`xterm`、`motion`、`xstate` 等大型依赖会被打包进主 chunk。

**建议**: 在 `vite.config.ts` 中配置手动 chunk 分割：

```typescript
build: {
    rollupOptions: {
        output: {
            manualChunks: {
                'vendor-xterm': ['xterm', '@xterm/addon-fit'],
                'vendor-motion': ['motion'],
                'vendor-xstate': ['xstate'],
                'vendor-react': ['react', 'react-dom'],
            }
        }
    }
}
```

减少首屏加载体积，终端等不常用功能按需加载。

# Zen-Swarm 进程监控面板设计规范

## 概述

为 zen-swarm 设计一个类似 macOS 活动监视器的进程监控面板，提供实时进程监控、资源使用查看和进程控制功能。

## 需求摘要

| 维度     | 决策                                         |
| -------- | -------------------------------------------- |
| 监控范围 | 双视图：zen-swarm 进程 + 系统进程（可切换）  |
| 核心功能 | CPU/内存实时监控、进程控制、日志查看、进程树 |
| 界面风格 | macOS 活动监视器风格（标签页 + 列表）        |
| 集成方式 | 独立页面路由 `/monitor`                      |
| 更新频率 | 实时更新（1-2 秒刷新）                       |
| 日志功能 | 基础滚动 + 自动跳转底部                      |
| 进程树   | 仅 PID 父子关系                              |
| 历史图表 | 不需要，只看当前数据                         |

## 界面设计

### 整体布局

```
┌─────────────────────────────────────────────────────────────┐
│  [CPU] [Memory] [Energy] [Disk] [Network] [Agents]         │  ← 标签页
├─────────────────────────────────────────────────────────────┤
│  🔍 [搜索框____________]  [视图: Zen-Swarm ▼]  [⚙️ 刷新]   │  ← 工具栏
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │ PID    名称           CPU %   内存      状态    操作   ││  ← 表头（可排序）
│  ├─────────────────────────────────────────────────────────┤│
│  │ 1234   zen-swarm      12.5%   256 MB   运行中  [⏹️][📋] ││
│  │ 1235   agent-default   5.2%   128 MB   运行中  [⏹️][📋] ││
│  │ 1236   node           0.0%    64  MB   睡眠    [▶️][📋] ││
│  │ ...                                                      ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  选中的进程: zen-swarm (PID: 1234)                          │  ← 详情面板
│  CPU: 12.5%  内存: 256 MB  运行时间: 2h 30m                 │
│  [查看日志]  [进程树]                                        │
└─────────────────────────────────────────────────────────────┘
```

### 标签页定义

| 标签    | 描述                                           | 默认排序列 |
| ------- | ---------------------------------------------- | ---------- |
| CPU     | 按 CPU 使用率排序的进程列表                    | CPU % 降序 |
| Memory  | 按内存使用排序的进程列表                       | 内存 降序  |
| Energy  | 能耗影响评估（基于 CPU 使用估算）              | 能耗 降序  |
| Disk    | 磁盘读写活动                                   | 读取/写入  |
| Network | 网络活动                                       | 入站/出站  |
| Agents  | Zen-Swarm 专属视图（agents、tasks、subagents） | 状态       |

### 视图切换

```tsx
type MonitorView = 'zen-swarm' | 'system';

// zen-swarm 视图：仅显示与 zen-swarm 相关的进程
// - 主进程 (zen-swarm server)
// - Agent 实例
// - Task 执行进程
// - MCP server 子进程

// system 视图：显示所有系统进程
// - 需要后端提供系统进程 API
// - 可选：按用户/应用分组
```

## 组件架构

### 文件结构

```
zen-swarm/src/frontend/
├── views/
│   └── MonitorView.tsx           # 主视图组件
├── components/monitor/
│   ├── index.ts                  # 模块导出
│   ├── ProcessList.tsx           # 进程列表表格
│   ├── ProcessToolbar.tsx        # 工具栏（搜索、视图切换）
│   ├── ProcessDetail.tsx         # 详情面板
│   ├── ProcessTree.tsx           # 进程树视图
│   ├── ProcessLog.tsx            # 日志查看器
│   ├── MonitorTabs.tsx           # 标签页组件
│   └── types.ts                  # 类型定义
└── stores/
    └── monitorStore.ts           # Zustand 状态管理
```

### 类型定义

```typescript
// components/monitor/types.ts

export type MonitorTab = 'cpu' | 'memory' | 'energy' | 'disk' | 'network' | 'agents';

export type MonitorView = 'zen-swarm' | 'system';

export type ProcessStatus = 'running' | 'sleeping' | 'idle' | 'stopped' | 'zombie';

export interface ProcessInfo {
    pid: number;
    ppid: number; // 父进程 ID
    name: string;
    command?: string; // 完整命令行
    cpuPercent: number;
    memoryBytes: number;
    status: ProcessStatus;
    startTime: Date;
    user?: string;

    // 可选字段（某些标签页使用）
    diskRead?: number;
    diskWrite?: number;
    networkIn?: number;
    networkOut?: number;
    energyImpact?: number;

    // zen-swarm 专属
    agentType?: 'main' | 'agent' | 'task' | 'mcp';
    taskId?: string;
    agentId?: string;
}

export interface ProcessTreeNode extends ProcessInfo {
    children: ProcessTreeNode[];
}
```

### 状态管理

```typescript
// stores/monitorStore.ts

import { create } from 'zustand';

interface MonitorState {
    // 视图状态
    activeTab: MonitorTab;
    viewMode: MonitorView;
    searchQuery: string;
    sortBy: keyof ProcessInfo;
    sortOrder: 'asc' | 'desc';

    // 数据
    processes: ProcessInfo[];
    selectedPid: number | null;
    isLoading: boolean;
    error: string | null;

    // 日志
    logs: Record<number, string[]>;
    showLogPanel: boolean;
    showTreePanel: boolean;

    // Actions
    setActiveTab: (tab: MonitorTab) => void;
    setViewMode: (mode: MonitorView) => void;
    setSearchQuery: (query: string) => void;
    setSortBy: (key: keyof ProcessInfo) => void;
    setSelectedPid: (pid: number | null) => void;
    refreshProcesses: () => Promise<void>;

    // 进程控制
    killProcess: (pid: number) => Promise<void>;
    restartProcess: (pid: number) => Promise<void>;

    // 日志
    fetchLogs: (pid: number) => Promise<void>;
    appendLog: (pid: number, line: string) => void;
    toggleLogPanel: () => void;
    toggleTreePanel: () => void;
}
```

## 后端 API 设计

### tRPC Router

```typescript
// server/routers/monitor.ts

import { z } from 'zod';
import { router, publicProcedure } from '../trpc';

export const monitorRouter = router({
    // 获取进程列表
    listProcesses: publicProcedure
        .input(
            z.object({
                view: z.enum(['zen-swarm', 'system']).default('zen-swarm'),
            }),
        )
        .query(async ({ input }) => {
            // 返回 ProcessInfo[]
        }),

    // 获取单个进程详情
    getProcess: publicProcedure.input(z.object({ pid: z.number() })).query(async ({ input }) => {
        // 返回 ProcessInfo
    }),

    // 获取进程树
    getProcessTree: publicProcedure
        .input(
            z.object({
                rootPid: z.number().optional(),
            }),
        )
        .query(async ({ input }) => {
            // 返回 ProcessTreeNode
        }),

    // 终止进程
    killProcess: publicProcedure
        .input(
            z.object({
                pid: z.number(),
                signal: z.enum(['SIGTERM', 'SIGKILL']).default('SIGTERM'),
            }),
        )
        .mutation(async ({ input }) => {
            // 返回 { success: boolean }
        }),

    // 获取进程日志（流式）
    getProcessLogs: publicProcedure
        .input(
            z.object({
                pid: z.number(),
                lines: z.number().default(100),
            }),
        )
        .query(async ({ input }) => {
            // 返回 string[]
        }),

    // 订阅实时日志（WebSocket）
    subscribeLogs: publicProcedure.input(z.object({ pid: z.number() })).subscription(async ({ input }) => {
        // 返回 Observable<string>
    }),

    // 获取系统资源概览
    getSystemStats: publicProcedure.query(async () => {
        return {
            cpuTotal: number,
            memoryTotal: number,
            memoryUsed: number,
            uptime: number,
        };
    }),
});
```

### 进程数据采集

```typescript
// server/services/processMonitor.ts

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ProcessMonitor {
    // 使用 ps 命令获取进程信息（跨平台兼容）
    async getProcessList(): Promise<ProcessInfo[]> {
        // macOS/Linux: ps aux
        // Windows: tasklist /FO CSV
    }

    // 获取进程树
    async getProcessTree(rootPid?: number): Promise<ProcessTreeNode> {
        // 使用 pstree 或构建树结构
    }

    // 获取进程日志（需要进程支持）
    async getLogs(pid: number, lines: number): Promise<string[]> {
        // 读取 .langgraph_api/logs/{pid}.log
        // 或通过 journalctl/log stream
    }

    // 获取网络/磁盘活动
    async getIOStats(pid: number): Promise<{ disk: IOStats; network: IOStats }> {
        // macOS: nettop, iostat
        // Linux: /proc/{pid}/io, /proc/net/dev
    }
}
```

## 实现计划

### Phase 1: 基础架构

1. 创建 `MonitorView` 组件并注册到 app-registry
2. 实现基础 UI 布局（标签页 + 工具栏 + 列表）
3. 创建 `monitorStore` Zustand store
4. 实现后端 `monitorRouter` 基础 API

### Phase 2: 核心功能

1. 实现进程列表显示和排序
2. 实现视图切换（zen-swarm / system）
3. 实现搜索过滤功能
4. 实现进程详情面板
5. 实现实时刷新（1-2 秒轮询）

### Phase 3: 进程控制

1. 实现终止进程功能
2. 实现进程树视图
3. 实现日志查看器
4. 添加确认对话框（危险操作）

### Phase 4: 优化完善

1. 添加键盘快捷键
2. 优化大数据量性能（虚拟滚动）
3. 添加导出功能
4. 国际化支持

## 设计细节

### 配色方案

遵循 zen-swarm 现有 Minimal 风格：

```css
/* 进程状态颜色 */
--status-running: #22c55e; /* green-500 */
--status-sleeping: #f59e0b; /* amber-500 */
--status-idle: #6b7280; /* gray-500 */
--status-stopped: #ef4444; /* red-500 */
--status-zombie: #7c3aed; /* violet-600 */

/* CPU/内存使用量热力图 */
--usage-low: #22c55e; /* < 30% */
--usage-medium: #f59e0b; /* 30-70% */
--usage-high: #ef4444; /* > 70% */
```

### 交互设计

| 操作   | 行为                                     |
| ------ | ---------------------------------------- |
| 单击行 | 选中进程，显示详情                       |
| 双击行 | 打开日志面板                             |
| 右键行 | 显示上下文菜单（终止、复制 PID、查看树） |
| Cmd+F  | 聚焦搜索框                               |
| Cmd+R  | 刷新列表                                 |
| Delete | 终止选中进程（需确认）                   |

### 响应式布局

- **桌面（≥1024px）**：完整三栏布局
- **平板（768-1023px）**：隐藏详情面板，双击弹出
- **移动端（<768px）**：单列列表，简化标签页

## 风险与限制

### 技术限制

1. **跨平台兼容**：Windows/macOS/Linux 进程命令不同，需要抽象层
2. **权限问题**：获取其他用户进程可能需要提升权限
3. **日志访问**：只有 zen-swarm 子进程的日志可直接访问

### 性能考虑

1. **轮询频率**：1-2 秒刷新可能对系统有影响，建议可配置
2. **大数据量**：系统视图可能有数百进程，需虚拟滚动
3. **日志大小**：需限制日志行数，避免内存溢出

## 参考资源

- [macOS Activity Monitor](https://support.apple.com/guide/activity-monitor/welcome/mac)
- [htop - Interactive Process Viewer](https://htop.dev/)
- [zen-swarm Frontend Design Memory](/.claude/memories/zen-swarm-frontend-design/MEMORY.md)
- [zen-swarm Panel Layout Memory](/.claude/memories/zen-swarm-panel-layout-system/MEMORY.md)

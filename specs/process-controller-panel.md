# Process Controller Panel - 进程控制器面板

## 概述

为 zen-code 设计一个进程控制器面板，用于监控和管理 terminal 工具创建的子进程。用户可以查看所有后台进程的状态、资源使用情况，并支持一键关闭和查看实时输出。

## 需求总结

### 功能目标

| 功能     | 描述                                       |
| -------- | ------------------------------------------ |
| 进程列表 | 展示所有 terminal 工具创建的后台进程       |
| 进程监控 | 实时显示进程状态、运行时长、CPU/内存使用率 |
| 进程管理 | 支持关闭进程、查看实时输出                 |
| 实时刷新 | 每秒自动更新进程状态                       |

### 显示信息

| 字段     | 说明       | 数据来源                           |
| -------- | ---------- | ---------------------------------- |
| PID      | 进程 ID    | `child_process.pid`                |
| Command  | 执行的命令 | 新增：启动时记录                   |
| Duration | 运行时长   | 计算差值：`Date.now() - startTime` |
| CPU%     | CPU 使用率 | `pidusage` 库                      |
| Memory%  | 内存使用率 | `pidusage` 库                      |
| Status   | 进程状态   | 检查进程是否存活                   |

### 操作功能

| 操作     | 说明                         |
| -------- | ---------------------------- |
| 关闭进程 | 发送 SIGTERM，必要时 SIGKILL |
| 查看输出 | 弹出新面板显示 stdout/stderr |
| 刷新列表 | 手动刷新（自动刷新每秒执行） |

## 技术方案

### 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                        zen-code (TUI)                        │
│  ┌─────────────────┐    ┌──────────────────────────────┐   │
│  │   ProcessPanel  │───▶│   ProcessOutputPanel         │   │
│  │   (列表视图)     │    │   (输出预览)                  │   │
│  └────────┬────────┘    └──────────────────────────────┘   │
│           │ polling (1s)                                    │
│           ▼                                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              ProcessManagerService                   │    │
│  │  - getProcessList()                                  │    │
│  │  - killProcess(pid)                                  │    │
│  │  - getProcessOutput(pid)                             │    │
│  └────────────────────┬────────────────────────────────┘    │
│                       │                                      │
└───────────────────────┼──────────────────────────────────────┘
                        │ 直接访问（同一进程）
                        ▼
┌───────────────────────────────────────────────────────────────┐
│           packages/agent-middlewares/bash_tools               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │               background_processes (Map)                │  │
│  │  Map<pid, ManagedProcess>                               │  │
│  │  - process: ResultPromise                               │  │
│  │  - stdout: string[]                                     │  │
│  │  - stderr: string[]                                     │  │
│  │  - command: string (新增)                               │  │
│  │  - startTime: number (新增)                             │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

### 数据结构扩展

#### ManagedProcess 接口扩展

```typescript
// packages/agent-middlewares/src/tools/bash_tools/bash_manager.ts

export interface ManagedProcess {
    process: ResultPromise;
    stdout: string[];
    stderr: string[];
    // 新增字段
    command: string; // 执行的命令
    startTime: number; // 启动时间戳 (ms)
}
```

#### ProcessInfo 接口（前端展示用）

```typescript
// zen-code/src/chat/types.ts

export interface ProcessInfo {
    pid: number;
    command: string;
    startTime: number;
    duration: number; // 运行时长 (ms)
    cpu: number; // CPU 使用率 (%)
    memory: number; // 内存使用率 (%)
    status: 'running' | 'stopped' | 'zombie';
}
```

### 核心组件

#### 1. ProcessManagerService

位置：`zen-code/src/chat/services/ProcessManagerService.ts`

```typescript
import pidusage from 'pidusage';
import { background_processes, ManagedProcess } from '@langgraph-js/agent-middlewares';

export class ProcessManagerService {
    /**
     * 获取所有进程信息（包含资源使用率）
     */
    async getProcessList(): Promise<ProcessInfo[]> {
        const processes: ProcessInfo[] = [];

        for (const [pid, managed] of background_processes) {
            try {
                const stats = await pidusage(pid);
                processes.push({
                    pid,
                    command: managed.command,
                    startTime: managed.startTime,
                    duration: Date.now() - managed.startTime,
                    cpu: stats.cpu,
                    memory: stats.memory,
                    status: this.checkStatus(managed),
                });
            } catch {
                // 进程可能已结束
                processes.push({
                    pid,
                    command: managed.command,
                    startTime: managed.startTime,
                    duration: Date.now() - managed.startTime,
                    cpu: 0,
                    memory: 0,
                    status: 'stopped',
                });
            }
        }

        return processes;
    }

    /**
     * 关闭进程
     */
    killProcess(pid: number): boolean {
        const managed = background_processes.get(pid);
        if (!managed) return false;

        managed.process.kill('SIGTERM');
        // 从 Map 中移除已关闭的进程
        background_processes.delete(pid);
        return true;
    }

    /**
     * 获取进程输出
     */
    getProcessOutput(pid: number): { stdout: string; stderr: string } | null {
        const managed = background_processes.get(pid);
        if (!managed) return null;

        return {
            stdout: managed.stdout.join(''),
            stderr: managed.stderr.join(''),
        };
    }

    private checkStatus(managed: ManagedProcess): 'running' | 'stopped' | 'zombie' {
        try {
            // 发送信号 0 检查进程是否存在
            process.kill(managed.process.pid!, 0);
            return 'running';
        } catch {
            return 'stopped';
        }
    }
}

export const processManager = new ProcessManagerService();
```

#### 2. ProcessPanel 组件

位置：`zen-code/src/chat/components/panels/ProcessPanel.tsx`

```typescript
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text } from 'ink';
import { UniversalPanel, PanelConfig } from 'ink-pro';
import { ProcessInfo, processManager } from '../../services/ProcessManagerService';
import ProcessOutputPanel from './ProcessOutputPanel';

interface ProcessPanelProps {
    onClose: () => void;
}

const ProcessPanel: React.FC<ProcessPanelProps> = ({ onClose }) => {
    const [processes, setProcesses] = useState<ProcessInfo[]>([]);
    const [outputPid, setOutputPid] = useState<number | null>(null);

    // 每秒刷新进程列表
    useEffect(() => {
        const refresh = async () => {
            const list = await processManager.getProcessList();
            setProcesses(list);
        };

        refresh();
        const interval = setInterval(refresh, 1000);
        return () => clearInterval(interval);
    }, []);

    // 手动刷新函数
    const refreshProcesses = useCallback(async () => {
        const list = await processManager.getProcessList();
        setProcesses(list);
    }, []);

    // 渲染进程项
    const renderItem = useCallback((proc: ProcessInfo, index: number, isSelected: boolean) => {
        const statusIcon = proc.status === 'running' ? '🟢' : '🔴';
        const duration = formatDuration(proc.duration);

        return (
            <Box flexDirection="column">
                <Box>
                    <Text color="cyan">{statusIcon} [{proc.pid}]</Text>
                    <Text> {truncate(proc.command, 40)}</Text>
                </Box>
                <Box paddingLeft={3}>
                    <Text dimColor>⏱ {duration}</Text>
                    <Text dimColor> | CPU: {proc.cpu.toFixed(1)}%</Text>
                    <Text dimColor> | MEM: {(proc.memory / 1024 / 1024).toFixed(1)}MB</Text>
                </Box>
            </Box>
        );
    }, []);

    // 删除（关闭）进程
    const handleKillProcess = useCallback((proc: ProcessInfo) => {
        processManager.killProcess(proc.pid);
    }, []);

    // 查看输出
    const handleSelect = useCallback((proc: ProcessInfo) => {
        setOutputPid(proc.pid);
    }, []);

    // 状态信息渲染函数
    const statusInfoFn = useCallback((items: ProcessInfo[]) => {
        return (
            <Text dimColor>
                运行中: {items.filter(p => p.status === 'running').length} |
                总计: {items.length} |
                Enter 查看输出 | Backspace/Delete 关闭进程
            </Text>
        );
    }, []);

    const panelConfig: PanelConfig<ProcessInfo> = useMemo(() => ({
        id: 'processes',
        title: '进程管理器',
        icon: '⚙️',
        dataSource: () => Promise.resolve(processes),
        searchable: true,
        searchFields: ['command'],
        renderItem,
        onSelect: handleSelect,
        onDelete: handleKillProcess,
        itemHeight: 2,
        statusInfo: statusInfoFn,
        // 自定义快捷键：'r' 手动刷新进程列表
        keyMap: {
            r: () => {
                refreshProcesses();
            },
        },
    }), [processes, renderItem, handleSelect, handleKillProcess, statusInfoFn, refreshProcesses]);

    return (
        <>
            {outputPid !== null ? (
                <ErrorBoundary name="ProcessOutputPanel" fallback={null}>
                    <ProcessOutputPanel
                        pid={outputPid}
                        onClose={() => setOutputPid(null)}
                    />
                </ErrorBoundary>
            ) : (
                <UniversalPanel config={panelConfig} onClose={onClose} />
            )}
        </>
    );
};

// 辅助函数
function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

function truncate(str: string, len: number): string {
    return str.length > len ? str.slice(0, len - 3) + '...' : str;
}

export default ProcessPanel;
```

#### 3. ProcessOutputPanel 组件

位置：`zen-code/src/chat/components/panels/ProcessOutputPanel.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useInput } from 'ink-pro';
import { processManager } from '../../services/ProcessManagerService.js';

interface ProcessOutputPanelProps {
    pid: number;
    onClose: () => void;
}

const ProcessOutputPanel: React.FC<ProcessOutputPanelProps> = ({ pid, onClose }) => {
    const [output, setOutput] = useState({ stdout: '', stderr: '' });

    // ESC 键退出
    useInput((input, key) => {
        if (key.escape) {
            onClose();
        }
    });

    // 实时更新输出
    useEffect(() => {
        const refresh = () => {
            const result = processManager.getProcessOutput(pid);
            if (result) setOutput(result);
        };

        refresh();
        const interval = setInterval(refresh, 500);
        return () => clearInterval(interval);
    }, [pid]);

    const truncatedStdout = truncateOutput(output.stdout, 20);
    const truncatedStderr = truncateOutput(output.stderr, 20);

    return (
        <Box flexDirection="column" padding={1}>
            <Box justifyContent="space-between" marginBottom={1}>
                <Text bold color="cyan">进程 [{pid}] 输出</Text>
                <Text dimColor>按 ESC 返回</Text>
            </Box>

            <Box flexDirection="column" marginBottom={1}>
                <Text color="green" bold>STDOUT:</Text>
                <Box borderStyle="single" borderColor="green" paddingX={1}>
                    <Text>{truncatedStdout || '(空)'}</Text>
                </Box>
            </Box>

            <Box flexDirection="column">
                <Text color="red" bold>STDERR:</Text>
                <Box borderStyle="single" borderColor="red" paddingX={1}>
                    <Text>{truncatedStderr || '(空)'}</Text>
                </Box>
            </Box>
        </Box>
    );
};

function truncateOutput(output: string, maxLines: number): string {
    const lines = output.split('\n');
    if (lines.length <= maxLines) return output;

    // 取最后 maxLines 行
    const lastLines = lines.slice(-maxLines);
    return `...${lastLines.join('\n')}`;
}

export default ProcessOutputPanel;
```

### 集成修改

#### 1. 扩展 bash_manager.ts

```typescript
// packages/agent-middlewares/src/tools/bash_tools/bash_manager.ts

import type { ResultPromise } from 'execa';

export interface ManagedProcess {
    process: ResultPromise;
    stdout: string[];
    stderr: string[];
    command: string; // 新增
    startTime: number; // 新增
}

export const background_processes = new Map<number, ManagedProcess>();
```

#### 2. 修改 bash_tool.ts

在创建进程时记录 command 和 startTime：

```typescript
// 在 run_in_background 分支中
const managed_process: ManagedProcess = {
    process: child_process,
    stdout: [],
    stderr: [],
    command: command, // 新增
    startTime: Date.now(), // 新增
};
```

#### 3. 添加 ChatView 类型

```typescript
// zen-code/src/chat/hooks/useChatPanels.ts

export type ChatView =
    | 'chat'
    | 'history'
    | 'knowledge'
    | 'settings'
    | 'model-provider'
    | 'agent'
    | 'task'
    | 'mcp'
    | 'process'; // 新增
```

#### 4. 添加切换函数

```typescript
// zen-code/src/chat/hooks/useChatPanels.ts

const switchToProcess = useCallback(() => {
    setActiveView('process');
}, []);
```

#### 5. 注册 /process 命令

```typescript
// zen-code/src/chat/commands/implementations.ts

export const processCommand: CommandDefinition = {
    name: 'process',
    description: '打开进程管理器面板',
    aliases: ['ps', 'proc'],
    usage: '/process',
    execute: async (args: string[], context: CommandContext): Promise<CommandResult> => {
        context.switchToProcess?.();
        return {
            success: true,
            message: '打开进程管理器',
            shouldClearInput: true,
        };
    },
};
```

#### 6. 添加懒加载

```typescript
// zen-code/src/chat/components/common/lazyPanels.tsx

export const LazyProcessPanel = lazy(() => import('../panels/ProcessPanel').then((m) => ({ default: m.default })));
```

#### 7. 添加依赖

```json
// package.json 或 zen-code/package.json

{
    "dependencies": {
        "pidusage": "^4"
    }
}
```

## 文件清单

| 文件路径                                                          | 操作 | 说明                      |
| ----------------------------------------------------------------- | ---- | ------------------------- |
| `packages/agent-middlewares/package.json`                         | 修改 | 添加 pidusage 依赖        |
| `packages/agent-middlewares/src/tools/bash_tools/bash_manager.ts` | 修改 | 扩展 ManagedProcess 接口  |
| `packages/agent-middlewares/src/tools/bash_tools/bash_tool.ts`    | 修改 | 记录 command 和 startTime |
| `packages/agent-middlewares/src/tools/bash_tools/index.ts`        | 修改 | 导出 ManagedProcess 类型  |
| `packages/agent-middlewares/src/index.ts`                         | 修改 | 重新导出类型              |
| `packages/ink-pro/package.json`                                   | 修改 | 添加 pidusage 依赖        |
| `packages/ink-pro/src/components/Panel/types.ts`                  | 修改 | 添加 getItemKey 选项      |
| `packages/ink-pro/src/components/Panel/VirtualScrollList.tsx`     | 修改 | 修复 React Key 警告       |
| `packages/ink-pro/src/components/Panel/UniversalPanel.tsx`        | 修改 | 条件显示 Backspace 快捷键 |
| `zen-code/package.json`                                           | 修改 | 添加 pidusage 依赖        |
| `zen-code/src/chat/types.ts`                                      | 修改 | 添加 ProcessInfo 接口     |
| `zen-code/src/chat/services/ProcessManagerService.ts`             | 新建 | 进程管理服务              |
| `zen-code/src/chat/components/panels/ProcessPanel.tsx`            | 新建 | 进程列表面板              |
| `zen-code/src/chat/components/panels/ProcessOutputPanel.tsx`      | 新建 | 输出预览面板              |
| `zen-code/src/chat/hooks/useChatPanels.ts`                        | 修改 | 添加 process 视图         |
| `zen-code/src/chat/context/ChatPanelContext.tsx`                  | 修改 | 添加 switchToProcess      |
| `zen-code/src/chat/components/layout/ChatController.tsx`          | 修改 | 传递 switchToProcess      |
| `zen-code/src/chat/components/input/ChatInput.tsx`                | 修改 | 传递 switchToProcess      |
| `zen-code/src/chat/context/CommandHandler.tsx`                    | 修改 | 添加 switchToProcess 支持 |
| `zen-code/src/chat/components/common/lazyPanels.tsx`              | 修改 | 添加 LazyProcessPanel     |
| `zen-code/src/chat/components/layout/LazyChatViewManager.tsx`     | 修改 | 添加 process 视图渲染     |
| `zen-code/src/chat/commands/implementations.ts`                   | 修改 | 添加 processCommand       |
| `zen-code/src/chat/commands/types.ts`                             | 修改 | 添加 switchToProcess 类型 |
| `zen-code/src/chat/components/status/StatusBar.tsx`               | 修改 | 添加后台进程计数显示      |

## 实现步骤

### Phase 1: 基础设施 (Backend)

1. ✅ 扩展 `ManagedProcess` 接口，添加 `command` 和 `startTime` 字段
2. ✅ 修改 `bash_tool.ts`，在创建进程时记录元数据
3. ✅ 添加 `pidusage` 依赖

### Phase 2: 服务层

1. ✅ 创建 `ProcessManagerService.ts`
2. ✅ 实现 `getProcessList()` 方法
3. ✅ 实现 `killProcess()` 方法
4. ✅ 实现 `getProcessOutput()` 方法

### Phase 3: UI 组件

1. ✅ 创建 `ProcessPanel.tsx`（使用 UniversalPanel）
2. ✅ 创建 `ProcessOutputPanel.tsx`
3. ✅ 添加懒加载配置

### Phase 4: 集成

1. ✅ 扩展 `useChatPanels` hook
2. ✅ 扩展 `ChatPanelContext`
3. ✅ 修改 `LazyChatViewManager`
4. ✅ 注册 `/process` 命令

### Phase 5: 测试与优化

1. ✅ 代码审查与 bug 修复
2. ✅ 添加 ErrorBoundary 保护
3. ✅ 修复 React Key 警告
4. ✅ 集成 Status Bar 进程显示
5. ⬜ 编写单元测试
6. ⬜ 测试边界情况（进程已结束、无进程等）
7. ⬜ 性能优化（大量输出时的处理）

## 交互设计

### 快捷键

| 按键                   | 功能                     |
| ---------------------- | ------------------------ |
| `↑` / `↓`              | 导航进程列表             |
| `Enter`                | 查看进程输出             |
| `Backspace` / `Delete` | 关闭选中进程             |
| `Esc`                  | 返回上一级 / 关闭面板    |
| `/`                    | 搜索进程（按命令或 PID） |
| `r`                    | 手动刷新列表             |

### 视觉设计

```
┌─────────────────────────────────────────────────────────┐
│ ⚙️ 进程管理器 (3 个进程)                     [ESC 关闭] │
├─────────────────────────────────────────────────────────┤
│ 🔍 搜索: _                                              │
├─────────────────────────────────────────────────────────┤
│   🟢 [12345] npm run dev                                │
│      ⏱ 2h 15m | CPU: 12.5% | MEM: 256.3MB              │
│                                                         │
│ → 🔴 [12346] webpack build                              │
│      ⏱ 0s | CPU: 0.0% | MEM: 0.0MB                     │
│                                                         │
│   🟢 [12347] tsc --watch                                │
│      ⏱ 1h 30m | CPU: 5.2% | MEM: 128.1MB               │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ 运行中: 2 | 总计: 3 | Enter 查看输出 | Backspace 关闭   │
└─────────────────────────────────────────────────────────┘
```

## 注意事项

1. **进程清理**：进程结束后，应从 `background_processes` 中移除，避免内存泄漏
2. **错误处理**：`pidusage` 可能因权限不足失败，需要优雅降级
3. **跨平台**：Windows 下的信号处理与 Unix 不同，需要测试
4. **性能**：大量输出时，`stdout/stderr` 数组可能很大，考虑限制缓冲区大小
5. **线程安全**：虽然 Node.js 是单线程，但进程状态可能在轮询间隔内变化

## 实现记录

### 代码审查与修复 (2025-02-25)

#### 1. ProcessPanel.tsx 修复

- **问题**: `searchFields` 类型不匹配，`pid` 是 number 类型
- **修复**: 只使用 `['command']` 进行搜索
- **问题**: `statusInfo` 回调参数错误，直接使用 state
- **修复**: 改为接收 `items` 参数的回调函数

#### 2. ProcessOutputPanel.tsx 增强

- **添加**: `useInput` 钩子监听 ESC 键，允许返回上级面板
- **功能**: 用户可以按 ESC 从输出预览返回进程列表

#### 3. ProcessManagerService.ts 优化

- **问题**: `killProcess` 方法发送 SIGTERM 后没有从 Map 中移除进程
- **修复**: 添加 `background_processes.delete(pid)`，确保已关闭进程不显示在列表中

#### 4. ErrorBoundary 集成

- **ProcessPanel.tsx**: 添加 ErrorBoundary 包裹 ProcessOutputPanel
- **错误隔离**: 输出面板错误不影响进程列表显示
- **命名规则**: 使用 `"ProcessOutputPanel"` 作为错误追踪标识

#### 5. React Key 警告修复

- **问题**: VirtualScrollList 渲染列表项时缺少 key prop
- **方案**:
    - 扩展 `VirtualScrollListProps` 添加 `getItemKey` 选项
    - 实现智能 key 生成器（优先级：item.key > item.id > item.pid > index）
    - 在 VirtualScrollList 中为每个 Box 添加 key
- **影响文件**:
    - `packages/ink-pro/src/components/Panel/types.ts`
    - `packages/ink-pro/src/components/Panel/VirtualScrollList.tsx`

#### 6. Status Bar 进程显示

- **功能**: 在状态栏显示后台进程数量
- **实现**:
    - 每 2 秒轮询进程数量
    - 只在进程数 > 0 时显示（避免占用空间）
    - 显示格式: `● BG (count)`
- **文件**: `zen-code/src/chat/components/status/StatusBar.tsx`

#### 7. UniversalPanel 快捷键提示优化

- **改进**: 条件显示 Backspace/Delete 快捷键
- **逻辑**: 只有配置 `onDelete` 回调时才显示删除快捷键
- **条件**: `filterable` 也使用相同模式处理 Tab 键

#### 8. ProcessPanel 状态信息更新

- **更新**: 状态栏文本从 "Backspace 关闭进程" 改为 "Backspace/Delete 关闭进程"
- **说明**: 明确支持两种快捷键

#### 9. 导出和依赖修复

- **packages/agent-middlewares**:
    - `bash_tools/index.ts`: 导出 `ManagedProcess` 类型和 `background_processes` Map
    - `index.ts`: 重新导出类型供 zen-code 使用
- **依赖**:
    - `packages/agent-middlewares/package.json`: 添加 `pidusage: ^4`
    - `zen-code/package.json`: 添加 `pidusage: ^4`

#### 10. CommandHandler 集成

- **ChatInput.tsx**: 传递 `switchToProcess` 到 useCommandHandler
- **CommandHandler.tsx**: 添加 `switchToProcess` 参数支持
- **commands/types.ts**: 扩展 `CommandContext` 类型
- **commands/implementations.ts**: 导出 `processCommand`

### 构建验证

所有修改通过构建测试：

```bash
bun run build
```

**结果**: ✅ 所有包构建成功

- ink-pro: 构建成功
- agent-middlewares: 构建成功
- zen-code: 构建成功 (394 共享 chunks)

## 后续迭代

- [ ] 支持批量操作（多选关闭）
- [ ] 支持发送自定义信号（SIGTERM/SIGKILL/SIGINT）
- [ ] 支持进程分组/标签
- [ ] 支持进程输出过滤/搜索
- [ ] 添加进程启动时间线视图

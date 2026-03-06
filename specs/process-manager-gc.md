# zen-code 进程管理器 GC 机制

> **状态**: ✅ 已实现（2026-03-06 验证 - `startGC()` 已在 ProcessManagerService 构造函数中启动）

## 背景与问题

`ProcessManagerService` 当前存在两个问题：

1. **内存泄漏**：进程退出后，`background_processes` Map 中的条目不会自动清理，形成僵尸记录
2. **UI 状态不实时**：`ProcessPanel` 每 1s 通过 `pidusage` 查询，但 `stopped` 状态的进程仍滞留在列表中

## 目标

在 `ProcessManagerService` 中添加一个 **5s 定时全量 GC 扫描**，用 `process.kill(pid, 0)`
探测每个已注册进程的存活状态，自动从 `background_processes` Map 中移除已死亡的条目。

## 技术方案

**改动范围：`zen-code/src/chat/services/ProcessManagerService.ts`**

| 特性     | 设计                                               |
| -------- | -------------------------------------------------- |
| 触发方式 | `setInterval` 5000ms 定时                          |
| 探测方式 | `process.kill(pid, 0)`（跨平台，不发信号，只探测） |
| 清理范围 | 仅从 `background_processes` Map 中 `delete`        |
| 副作用   | 无（不触发回调、不关闭 stdio）                     |
| 间隔配置 | 硬编码 5s                                          |
| GC 启动  | 在 `processManager` 单例创建时自动启动             |

## GC 逻辑伪代码

```
每 5s：
  遍历 background_processes 所有 (pid, managed) 条目
  对每个 pid 执行 process.kill(pid, 0)
    → 成功（不抛出）：进程存活，跳过
    → 抛出异常（ESRCH）：进程已死，执行 background_processes.delete(pid)
```

## 实现细节

- GC 扫描在 `ProcessManagerService` 构造函数中启动（单例模式，只启动一次）
- 无需 `stopGC()` 方法（进程生命周期内始终运行）
- 不影响现有的 `getProcessList` / `killProcess` / `getProcessOutput` 接口
- `ProcessPanel` 的 1s 刷新逻辑不变，GC 后下一次 1s 刷新时 UI 会自然更新

## 文件变更清单

| 文件                                                  | 变更                                       |
| ----------------------------------------------------- | ------------------------------------------ |
| `zen-code/src/chat/services/ProcessManagerService.ts` | 新增 `startGC()` 私有方法 + 构造函数中启动 |

## 依赖关系

- `background_processes`：`@langgraph-js/agent-middlewares` 导出的全局 Map
- `ManagedProcess`：包含 `process`、`stdout`、`stderr`、`command`、`startTime` 字段
- `ProcessInfo`：`zen-code` 内部类型，包含 `pid`、`status` 等 UI 展示字段

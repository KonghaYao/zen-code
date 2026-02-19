---
name: bash-process-tree-timeout-fix
description:
    修复 bash tool 超时无法杀死进程树的问题；根因是 process.kill(pid) 只能杀死直接子进程，无法杀死孙进程（如 dev
    server）；解决方案：启用 detached 创建进程组，使用 process.kill(-pid, signal) 杀死整个进程组，分步执行
    SIGTERM→等待→SIGKILL；适用于任何需要可靠杀死进程树的场景
tags:
    - process-management
    - timeout
    - process-tree
    - nodejs
    - bug-fix
category: bug-fix
created: 2025-01-19
last_updated: 2025-01-19
priority: high
context_scope: project
---

# ## 背景

## 背景

用户反馈 agent 的 bash 命令超时自动关闭未生效，服务器进程（如 `vite dev`、`tsx watch`）运行几十分钟未被关闭。

## 问题根因

1. **`kill()` 只杀直接子进程**：`process.kill(pid)` 默认发送 SIGTERM，只能杀死 shell 进程本身，无法杀死子进程（如 dev
   server）
2. **未启用进程组**：`detached: false` 时子进程属于父进程组，无法通过进程组杀死
3. **exit 事件不支持异步**：`process.on('exit')` 中 Node.js 事件循环已停止，`await` 不会生效
4. **竞态问题**：超时回调先 `delete(pid)` 再 kill，导致 exit 事件中找不到进程

## 解决方案

### 1. 启用进程组（`bash_tool.ts`）

```typescript
detached: !isWindows; // Unix 系统创建新进程组，PGID = PID
```

### 2. 跨平台进程树杀死（`bash_manager.ts`）

**异步版本**（超时、手动 kill、beforeExit）：

```typescript
// Windows: taskkill /F /T /PID (强制杀死进程树)
await execa('taskkill', ['/F', '/T', '/PID', String(pid)], { timeout: 5000 });

// Unix: 进程组杀死
process.kill(-pid, 'SIGTERM'); // 负号表示进程组
await new Promise((r) => setTimeout(r, 500)); // 等待 500ms
process.kill(-pid, 'SIGKILL'); // 强制杀死
```

**同步版本**（exit 事件）：

```typescript
// 直接 SIGKILL，不等待
process.kill(-pid, 'SIGKILL');
```

### 3. 信号处理策略

- **SIGTERM**：先优雅关闭（500ms 窗口）
- **SIGKILL**：强制杀死（兜底）

### 4. 清理逻辑分离

- `beforeExit`：异步清理（正常退出）
- `exit`：同步清理（只能用同步操作）
- `SIGINT/SIGTERM`：同步清理后 `process.exit(0)`

## 关键代码位置

- `packages/agent/src/tools/bash_tools/bash_tool.ts`：detached 配置
- `packages/agent/src/tools/bash_tools/bash_manager.ts`：forceKillProcessTree、cleanupAllBackgroundProcessesSync

## 测试验证

```bash
# 测试进程组杀死
bun -e "const { execa } = require('execa'); const p = execa('bash', ['-c', 'sleep 10 & wait'], { detached: true }); console.log(p.pid);"
# process.kill(-pid, 'SIGTERM') 成功杀死 bash + sleep
```

## 适用场景

- 需要可靠杀死进程树的后台任务管理系统
- 开发工具、CI/CD 系统中的进程管理
- 任何需要超时自动清理的场景

## 注意事项

- Windows 需要依赖 `taskkill` 命令
- Unix 进程组要求 `detached: true`
- exit 事件只能用同步代码

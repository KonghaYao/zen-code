# Zen-Code Shell 命令模式设计规范

## 概述

为 zen-code TUI 添加 Shell 命令模式功能。当用户在输入框输入的第一个字符为 `!`
时，进入命令行模式，后续文本作为 Shell 命令执行，命令在后台运行，结果即时显示。

**状态: ✅ 已实现（2026-03-06 验证）**

## 需求摘要

| 维度       | 决策                                   |
| ---------- | -------------------------------------- |
| 触发方式   | 输入 `!` 前缀 + Enter 回车执行         |
| 执行环境   | 当前工作目录 (cwd)                     |
| 结果显示   | **输入框上方临时区域**，5 秒后自动消失 |
| 显示限制   | 最多 10 行，超出截断                   |
| 长时间命令 | 后台运行，可在 ps 面板查看             |
| 多命令支持 | 否，一次只能运行一个命令               |
| 交互式命令 | 自动拒绝，提示使用非交互模式           |
| 命令历史   | 不需要                                 |
| 状态反馈   | 仅显示输出，无额外状态指示             |

## 用户交互流程

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ... 聊天消息区域（正常对话内容）...                        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  📟 $ npm run dev                      ← 输入框上方临时区域 │
│                                                             │
│  > my-project@1.0.0 dev                                    │
│  > vite                                                    │
│                                                             │
│  VITE v5.0.0  ready in 234 ms                              │
│  ➜  Local:   http://localhost:5173/                        │
│  ➜  Network: http://192.168.1.100:5173/                    │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  💡 Running in background (PID: 12345)                      │
├─────────────────────────────────────────────────────────────┤
│  [ ! npm run dev                                    ] ← 输入框 │
└─────────────────────────────────────────────────────────────┘

命令完成后输出区域自动消失，或按 Escape 手动关闭
```

## 核心功能

### 1. 命令解析与执行

```typescript
interface ShellCommand {
    raw: string; // 原始输入 "!npm run dev"
    command: string; // 解析后的命令 "npm run dev"
    cwd: string; // 执行目录（当前工作目录）
}
```

**输入解析规则**：

- 首字符为 `!` → 进入 Shell 命令模式
- `!` 后的内容作为命令执行（去除前导空格）
- 按 Enter 键触发执行
- 空命令（仅输入 `!`）不执行任何操作

### 2. 后台进程管理

```typescript
interface BackgroundProcess {
    id: string; // 进程唯一标识
    pid: number; // 系统 PID
    command: string; // 执行的命令
    cwd: string; // 执行目录
    startTime: Date; // 启动时间
    status: 'running' | 'exited' | 'killed';
    exitCode?: number; // 退出码（如果已退出）
}
```

**进程管理策略**：

- 所有命令都在后台执行（使用 `spawn`）
- 不阻塞用户界面
- 进程信息注册到全局进程管理器
- 可在 ps 面板查看和管理

### 3. 输出显示

**显示位置**：

- 输出显示在**输入框上方的临时区域**（类似 IDE 的 Quick Fix 弹窗）
- 不混入聊天消息区域，保持对话清晰
- 命令完成后可自动消失或手动关闭

**显示方式**：

- 格式类似终端输出（等宽字体）
- 支持实时流式输出（命令执行过程中持续显示）
- 临时区域有明确边界，与聊天区域分离

**输出处理**：

- stdout: 正常输出
- stderr: 错误输出（可以不同颜色显示）
- 合并显示在同一个输出区域

**生命周期**：

- 命令开始执行 → 临时区域出现
- 命令输出中 → 实时更新内容
- 命令完成 → **5 秒后自动消失**（或按 Escape/点击 × 立即关闭）

**显示限制**：

- 最多显示 **10 行**输出
- 超出部分自动截断，末尾显示 `... (more)` 提示
- 保持 UI 简洁，避免长输出占据过多空间

### 4. 交互式命令处理

**检测规则**：

- 检测常见交互式命令：`git commit`, `vim`, `nano`, `less`, `top` 等
- 或者检测命令是否请求 TTY

**处理策略**：

```typescript
// 自动添加非交互标志或提示用户
const INTERACTIVE_COMMANDS = [
    'vim',
    'nano',
    'less',
    'more',
    'top',
    'htop',
    'git commit',
    'git rebase -i',
    'crontab -e',
];

function handleInteractiveCommand(command: string): string | null {
    for (const ic of INTERACTIVE_COMMANDS) {
        if (command.includes(ic)) {
            return `⚠️ 交互式命令不支持，请使用非交互模式:\n` + `  例如: ${command} --no-edit 或使用 -m 参数`;
        }
    }
    return null;
}
```

## 技术方案

### 前端实现

**输入检测** (`zen-code/src/chat/components/ChatInput.tsx`):

```typescript
function handleInputChange(value: string) {
    if (value.startsWith('!')) {
        // 进入 Shell 命令模式
        setMode('shell');
        setShellCommand(value.slice(1));
    } else {
        setMode('chat');
    }
}

async function handleSubmit() {
    if (mode === 'shell' && shellCommand.trim()) {
        await executeShellCommand(shellCommand.trim());
    } else {
        // 正常聊天消息处理
    }
}
```

**命令执行 Hook** (`zen-code/src/chat/hooks/useShellCommand.ts`):

```typescript
function useShellCommand() {
    const executeCommand = async (command: string, cwd: string) => {
        // 1. 显示 "Running command: xxx" 消息
        // 2. 调用后端 API 执行命令
        // 3. 流式接收输出并显示
        // 4. 注册到进程管理器
    };

    return { executeCommand };
}
```

### 后端实现

**命令执行服务** (`packages/agent/src/tools/shell_command.ts`):

```typescript
import { spawn } from 'child_process';
import type { BackgroundProcess } from './types';

class ShellCommandService {
    private processes: Map<string, BackgroundProcess> = new Map();

    async execute(command: string, cwd: string): Promise<BackgroundProcess> {
        const process = spawn(command, [], {
            cwd,
            shell: true,
            detached: true, // 创建进程组，便于杀死进程树
        });

        const bgProcess: BackgroundProcess = {
            id: generateId(),
            pid: process.pid!,
            command,
            cwd,
            startTime: new Date(),
            status: 'running',
        };

        this.processes.set(bgProcess.id, bgProcess);

        // 流式输出
        process.stdout.on('data', (data) => {
            this.emitOutput(bgProcess.id, 'stdout', data.toString());
        });

        process.stderr.on('data', (data) => {
            this.emitOutput(bgProcess.id, 'stderr', data.toString());
        });

        process.on('close', (code) => {
            bgProcess.status = 'exited';
            bgProcess.exitCode = code ?? 0;
        });

        return bgProcess;
    }

    // 杀死进程（供 ps 面板调用）
    async kill(processId: string): Promise<void> {
        const bgProcess = this.processes.get(processId);
        if (bgProcess && bgProcess.pid) {
            // 使用进程组杀死整个进程树
            process.kill(-bgProcess.pid, 'SIGTERM');
        }
    }
}
```

### 与现有系统集成

**与 ps 面板集成**：

- 后台进程自动注册到现有进程管理器
- 用户可以在 ps 面板查看所有后台命令
- 支持在 ps 面板中杀死进程

**临时输出区域**：

- 位于输入框正上方，与聊天区域分离
- 作为独立组件渲染，不影响聊天消息流
- 支持关闭按钮（×）和停止按钮（⏹）
- 使用等宽字体和终端样式

## UI 设计

### 整体布局

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  [聊天消息区域]                                             │
│  User: 你好                                                 │
│  Agent: 你好！有什么可以帮助你的？                          │
│  ...                                                        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📟 $ ls -la                        [×] ← 关闭按钮       │ │
│ │─────────────────────────────────────────────────────────│ │
│ │ total 48                                                │ │
│ │ drwxr-xr-x  12 user  staff   384 Feb 28 10:00 .        │ │
│ │ drwxr-xr-x   5 user  staff   160 Feb 27 15:30 ..       │ │
│ │ -rw-r--r--   1 user  staff  1024 Feb 28 09:00 file.ts  │ │
│ │                                                         │ │
│ │ ✓ Completed in 0.02s                                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                    ↑ 输入框上方的临时输出区域               │
├─────────────────────────────────────────────────────────────┤
│ [ ! ls -la                                       ] [发送]   │
└─────────────────────────────────────────────────────────────┘
```

### 输入框状态

```
普通模式:  [ Type your message...                   ]
命令模式:  [ ! ls -la                               ]
           ↑
           检测到 ! 前缀，准备执行命令
```

### 临时输出区域样式

**运行中状态**：

```
┌─────────────────────────────────────────────────────────┐
│ 📟 $ npm run dev                         [⏹ 停止] [×]  │
│─────────────────────────────────────────────────────────│
│ > my-project@1.0.0 dev                                 │
│ > vite                                                 │
│                                                        │
│ VITE v5.0.0  ready in 234 ms                           │
│ ➜  Local:   http://localhost:5173/                     │
│                                                        │
│ ⏳ Running... (PID: 12345)                             │
└─────────────────────────────────────────────────────────┘
```

**完成状态**（5 秒后自动消失）：

```
┌─────────────────────────────────────────────────────────┐
│ 📟 $ npm run build                                      │
│─────────────────────────────────────────────────────────│
│ > my-project@1.0.0 build                               │
│ > tsc && vite build                                    │
│                                                        │
│ ✓ 42 modules transformed.                              │
│ ✓ built in 1.23s                                       │
│                                                        │
│ ✓ Completed in 1.25s  [×]                              │
└─────────────────────────────────────────────────────────┘
```

**超长输出截断**（最多 10 行）：

```
┌─────────────────────────────────────────────────────────┐
│ 📟 $ cat large-file.txt                                 │
│─────────────────────────────────────────────────────────│
│ line 1 content here...                                  │
│ line 2 content here...                                  │
│ line 3 content here...                                  │
│ ...                                                     │
│ line 9 content here...                                  │
│ line 10 content here...                                 │
│ ... (more)                                              │
│                                                         │
│ ✓ Completed in 0.05s  [×]                               │
└─────────────────────────────────────────────────────────┘
```

## 边界情况处理

| 场景                 | 处理方式                                       |
| -------------------- | ---------------------------------------------- |
| 空命令 (`!`)         | 忽略，不执行任何操作                           |
| 命令执行失败         | 显示 stderr 输出，不显示额外错误状态           |
| 命令不存在           | Shell 返回 "command not found"，正常显示       |
| 权限不足             | Shell 返回 "Permission denied"，正常显示       |
| 网络命令超时         | 不设置超时，由用户在 ps 面板手动终止           |
| 用户快速输入多条命令 | 一次只能执行一条，需等待当前命令完成或手动终止 |
| 超长输出             | 截断显示前 10 行，末尾显示 `... (more)`        |
| 输出区域已显示       | 新命令会替换当前输出（一次只能运行一个）       |

## 文件结构

```
zen-code/src/
├── chat/
│   ├── components/
│   │   ├── ChatInput.tsx              # 添加 ! 前缀检测
│   │   └── ShellOutputPreview.tsx     # 新增：输入框上方的临时输出区域
│   └── hooks/
│       └── useShellCommand.ts         # 新增：命令执行 Hook
│
packages/agent/src/
└── tools/
    ├── shell_command.ts               # 新增：命令执行服务
    └── process_manager.ts             # 扩展：后台进程管理
```

## 实现优先级

1. **P0 - 核心功能**
    - [ ] 输入框 `!` 前缀检测
    - [ ] 命令执行与输出显示
    - [ ] 后台进程注册

2. **P1 - 体验优化**
    - [ ] 流式输出（实时显示）
    - [ ] 交互式命令检测与提示
    - [ ] 输出样式美化

3. **P2 - 可选增强**
    - [ ] 命令自动补全
    - [ ] 快捷键支持 (Ctrl+C 终止)
    - [ ] 输出搜索/过滤

## 测试用例

```typescript
describe('Shell Command Mode', () => {
    it('should detect ! prefix and enter shell mode', () => {
        const input = '!npm run dev';
        expect(isShellCommand(input)).toBe(true);
        expect(parseCommand(input)).toBe('npm run dev');
    });

    it('should execute command in cwd', async () => {
        const result = await executeCommand('echo hello', '/tmp');
        expect(result.output).toContain('hello');
    });

    it('should reject interactive commands', () => {
        const warning = checkInteractive('git commit');
        expect(warning).toContain('非交互模式');
    });

    it('should register process to manager', async () => {
        const process = await executeCommand('sleep 100', '/tmp');
        expect(processManager.has(process.id)).toBe(true);
    });

    it('should truncate output to 10 lines', () => {
        const longOutput = Array(20).fill('line').join('\n');
        const truncated = truncateOutput(longOutput, 10);
        expect(truncated.split('\n').length).toBe(11); // 10 lines + '... (more)'
        expect(truncated).toContain('... (more)');
    });

    it('should auto-hide output after 5 seconds', async () => {
        const { getByText, queryByText } = render(<ShellOutputPreview />);
        // 执行命令后输出显示
        expect(getByText('Completed')).toBeInTheDocument();
        // 等待 5 秒后自动消失
        await waitFor(() => expect(queryByText('Completed')).toBeNull(), { timeout: 6000 });
    });
});
```

## 安全考虑

1. **命令注入**: 直接执行用户输入，依赖 Shell 自身的安全机制
2. **资源限制**: 不限制命令执行时间和资源，依赖用户手动管理
3. **文件访问**: 继承当前进程的文件系统权限

## 参考文档

- [process-monitor-panel.md](./process-monitor-panel.md) - 进程监控面板设计
- [terminal-component.md](./terminal-component.md) - 终端组件设计
- [bash-process-tree-timeout-fix](../.claude/memories/bash-process-tree-timeout-fix/MEMORY.md) - 进程树管理经验

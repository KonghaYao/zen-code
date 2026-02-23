---
name: agent-middlewares-package-architecture
description:
    创建 @langgraph-js/agent-middlewares 包将 FilesystemMiddleware 和 TerminalMiddleware 从 zen-swarm
    迁移为独立可复用包；包含文件系统操作（read、write、edit、glob、grep、folder）和终端命令执行（跨平台支持）两个中间件；使用
    BaseAgentStateType 替代 SwarmStateType 实现通用性；配置 vite-plugin-dts 生成类型声明文件，external Node.js
    内置模块；供 zen-swarm 和 packages/agent 共享使用
tags:
    - middleware
    - filesystem
    - terminal
    - package-architecture
    - vite-config
category: architecture
created: 2025-01-23
last_updated: 2025-01-23
priority: high
context_scope: project
---

# ## 背景

## 背景

用户需要将 zen-swarm 项目中的 filesystem tools 和 bash tools 封装为 LangChain
middleware 形式，并创建一个独立包供 agent 和 zen-swarm 共用，避免代码重复。

## 决策

1. **创建独立包**：`@langgraph-js/agent-middlewares`
2. **迁移工具到中间件层**：将 filesystem 和 bash 工具从 `tools/` 目录迁移到中间件包
3. **统一类型**：使用 `BaseAgentStateType` 替代项目特定的 `SwarmStateType`
4. **重命名强调跨平台**：`BashMiddleware` → `TerminalMiddleware`

## 实现细节

### 1. 包结构

```
packages/agent-middlewares/
├── src/
│   ├── filesystem.ts           # FilesystemMiddleware 实现
│   ├── terminal.ts            # TerminalMiddleware 实现
│   ├── index.ts               # 主入口 + BaseAgentStateType 定义
│   ├── tools/
│   │   ├── filesystem_tools/  # 6个文件操作工具
│   │   └── bash_tools/        # bash_tool（终端命令）
│   └── utils/
│       └── ripgrep.ts         # ripgrep 下载和路径管理
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

### 2. 中间件封装

**FilesystemMiddleware**（`packages/agent-middlewares/src/filesystem.ts`）：

- 提供工具：`read_file`, `write_file`, `edit_file`, `glob_files`, `search_files_rg`, `folder_operations`
- 所有路径基于 `runtime.state.cwd` 解析

**TerminalMiddleware**（`packages/agent-middlewares/src/terminal.ts`）：

- 提供工具：`terminal`
- 支持前台/后台命令执行、输出检索、进程控制
- 跨平台支持（Bash on Linux/macOS, CMD on Windows）

### 3. 类型通用化

**BaseAgentStateType 定义**（`packages/agent-middlewares/src/index.ts:33`）：

```typescript
export type BaseAgentStateType = {
    cwd?: string;
    [key: string]: any;
};
```

所有工具文件中的类型导入改为：

```typescript
import type { BaseAgentStateType } from '../../index.js';
// 替代之前的：import { SwarmStateType } from '../../state.js';
```

### 4. 构建配置

**vite.config.ts** 关键配置：

```typescript
export default defineConfig({
    build: {
        lib: {
            entry: 'src/index.ts',
            fileName: 'index',
            formats: ['es'],
        },
        rollupOptions: {
            external: ['fs', 'path', 'stream', 'os', 'util', 'zlib', 'events', 'node:*'], // External 所有 Node.js 内置模块
            output: {
                preserveModules: true, // 保留模块结构
                preserveModulesRoot: 'src',
            },
        },
    },
    plugins: [
        dts({
            tsconfigPath: './tsconfig.json',
            exclude: ['**/*.test.ts', '**/*.spec.ts'],
            compilerOptions: {
                baseUrl: '.',
                paths: {
                    '@/*': ['src/*'],
                },
            },
        }),
    ],
});
```

**package.json exports**：

```json
{
    "exports": {
        ".": {
            "types": "./dist/index.d.ts",
            "import": "./dist/index.js"
        },
        "./filesystem": {
            "types": "./dist/filesystem.d.ts",
            "import": "./dist/filesystem.js"
        },
        "./terminal": {
            "types": "./dist/terminal.d.ts",
            "import": "./dist/terminal.js"
        }
    }
}
```

### 5. 使用方更新

**zen-swarm/src/middlewares/registry.ts:16**：

```typescript
const filesystem = {
    id: 'filesystem',
    name: 'filesystem',
    description: 'Filesystem operations (read, write, search, folder)',
    execute: async () =\&gt; {
        const { FilesystemMiddleware } = await import('@langgraph-js/agent-middlewares');
        return new FilesystemMiddleware();
    },
};
```

**packages/agent/src/middlewares/index.ts:6**：

```typescript
export { FilesystemMiddleware, TerminalMiddleware } from '@langgraph-js/agent-middlewares';
```

### 6. 构建命令

```bash
# 安装依赖
bun add -d vite-plugin-dts

# 构建所有包
bun run --filter './packages/*' build
```

## 适用场景

- 需要在多个 LangGraph agent 项目间共享 middleware 实现
- 需要 filesystem 和 terminal 操作能力的 agent
- 跨平台兼容的终端命令执行需求

## 注意

- **类型声明生成**：必须使用 `vite-plugin-dts` 并配置 `preserveModules: true`
- **Node.js 模块 external**：在 `rollupOptions.external` 中列出所有 Node.js 内置模块
- **types 字段指向 dist**：package.json 中的 `types` 字段应指向 `dist/*.d.ts` 而非 `src/*.ts`
- **通用状态类型**：使用 `BaseAgentStateType` 而非项目特定的状态类型，确保跨项目复用

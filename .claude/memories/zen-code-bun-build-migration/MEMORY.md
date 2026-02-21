---
name: zen-code-bun-build-migration
description:
    将 zen-code 从 Vite 构建迁移到 Bun 原生构建，使用 code splitting 实现 4 个入口点共享 51 个
    chunks；包括构建配置、external 依赖列表、react-devtools-core mock 模块处理、文件扩展名和 shebang 配置；适用于需要从
    Vite 迁移到 Bun 构建且需要代码分割的项目
tags:
    - bun
    - build-system
    - code-splitting
    - vite-migration
    - zen-code
category: architecture
created: 2025-02-21
last_updated: 2025-02-21
priority: high
context_scope: project
---

# ## 背景

## 背景

用户需要将 zen-code 项目从 Vite 构建系统迁移到 Bun 原生构建。初始实现为每个入口点单独打包，导致代码重复。经用户反馈后，改用 Bun 的 code
splitting 功能。

## 解决方案

### 核心配置

`zen-code/bun.build.ts` 中的关键配置：

```typescript
const result = await build({
    entrypoints: ['./src/cli.ts', './src/app.tsx', './src/zen-keyboard.tsx', './src/nonInteractive.ts'],
    outdir: './dist',
    target: 'bun',
    format: 'esm',
    minify: true,
    sourcemap: false,
    splitting: true, // 启用代码分割
    root: './src',
    external: [
        'bun:sqlite',
        'bun:*',
        'path',
        'crypto',
        'util',
        'stream',
        'fs',
        'os',
        'events',
        'chalk',
        'extract-zip',
        'fs-extra',
        'path-exists',
        'tempy',
        'xdg-basedir',
        'openai',
        'yaml',
        'zod',
        'ink-markdown-es',
        '@anthropic-ai/sdk',
        '@langchain/anthropic',
        '@langchain/google-genai',
        '@google/generative-ai',
        '@langchain/core',
        '@langchain/langgraph',
        '@langchain/mcp-adapters',
        '@langgraph-js/standard-agent',
        '@langchain/openai',
        'langchain',
        'node-notifier',
        'micromatch',
        'kysely-bun-worker',
        'kysely-wasm',
        'kysely',
        'lowdb',
        'lowdb/node',
        'execa',
        'diff-match-patch',
        'proper-lockfile',
        'string-width',
        'usehooks-ts',
        'node-sqlite3-wasm',
        'fuzzysort',
    ],
    define: {
        __filename: 'import.meta.filename',
        'window.FormData': 'globalThis.FormData',
    },
});
```

### 关键决策

1. **一次性构建所有入口**：使用单一 build() 调用构建所有入口点，让 Bun 自动进行代码分割
2. **启用 splitting**：`splitting: true` 自动提取共享代码到 chunks
3. **保持 .js 扩展名**：不改为 .mjs
4. **保持 shebang**：使用 `#!/usr/bin/env node` 而非 bun
5. **react-devtools-core mock**：创建临时 mock 模块解决构建依赖

### 构建结果

| 指标     | Vite      | Bun (无分割) | Bun (有分割)            |
| -------- | --------- | ------------ | ----------------------- |
| 总大小   | ~15MB     | ~4.4MB       | ~6.3MB                  |
| 文件数   | ~50       | 4            | 55 (4 入口 + 51 chunks) |
| 代码共享 | chunks 中 | 重复         | chunks 中               |

### 构建产物结构

```
zen-code/dist/
├── cli.js                 # CLI 入口 (~4KB, 可执行)
├── app.js                 # TUI 应用 (~143KB)
├── zen-keyboard.js       # 键盘测试器 (~547B)
├── nonInteractive.js     # 非交互模式 (~1.6KB)
└── chunk-*.js           # 51 个共享代码块
```

### package.json 配置

```json
{
    "main": "./dist/app.js",
    "bin": "./dist/cli.js",
    "scripts": {
        "build": "bun run bun.build.ts"
    }
}
```

## 适用场景

- 需要从 Vite 迁移到 Bun 构建的项目
- 有多个入口点且需要代码共享的项目
- 需要使用 Bun 运行时特定功能的项目

## 注意事项

1. **external 列表必须完整**：遗漏的依赖会被打包进 bundle，导致重复
2. **mock react-devtools-core**：这是临时方案，实际项目中应确保依赖正确安装
3. **cleanup 代码可以删除**：mock module 的清理代码可以安全删除，因为每次构建会覆盖
4. **target: 'bun'**：虽然 shebang 是 node，但构建产物为 Bun 优化，建议用 Bun 运行

## 代码分割优势

- 51 个共享 chunks 包含 React、LangChain、工具函数等可复用代码
- 每个入口点只包含自己特有的代码
- 总体大小比无分割略大，但减少了内存占用和启动时间
- Chunks 通过动态 import 按需加载

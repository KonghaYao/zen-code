# Rust Agent Middlewares 设计文档

## 概述

`rust-agent-middlewares`
是 Rust 版本的中间件具体实现包，提供文件系统操作（`FilesystemMiddleware`）和终端命令执行（`TerminalMiddleware`）能力。与 TypeScript
`@langgraph-js/agent-middlewares` 完全对齐，作为三层架构中的具体实现层（介于框架层 `rust-create-agent` 与应用层之间）。

**版本**: v0.1.0  
**状态**: 开发中  
**基础框架**: rust-create-agent（本 monorepo）  
**对齐目标**: `packages/agent-middlewares/` (TypeScript)  
**参考文档**:

- `packages/agent-middlewares/src/filesystem.ts` - FilesystemMiddleware 参考
- `packages/agent-middlewares/src/tools/filesystem_tools/` - 各工具参考实现
- `specs/rust-create-agent-design.md` - 框架层设计

---

## 核心需求

### 1. FilesystemMiddleware

与 TypeScript 版本对齐的完整文件系统工具集：

| 工具名              | TS 对应        | 说明                                                   |
| ------------------- | -------------- | ------------------------------------------------------ |
| `read_file`         | `read_tool`    | 读取文件，支持行偏移/限制，二进制检测，cat -n 格式输出 |
| `write_file`        | `write_tool`   | 写入文件，自动创建父目录                               |
| `edit_file`         | `replace_tool` | 精确字符串替换，唯一性校验，支持 replace_all           |
| `glob_files`        | `glob_tool`    | 文件名模式搜索，跳过常见构建目录，按修改时间排序       |
| `search_files_rg`   | `grep_tool`    | 包装 ripgrep，15s 超时，默认 500 行限制                |
| `folder_operations` | `folder_tool`  | 文件夹 create / list / exists                          |

### 2. TerminalMiddleware

跨平台终端命令执行：

- macOS/Linux: `bash -c`
- Windows: `cmd /C`
- 120 秒超时（可配置）
- 分离 stdout / stderr，附带退出码

### 3. 工具工厂方法

每个中间件提供 `build_tools(cwd: &str) -> Vec<Box<dyn Tool>>` 工厂方法，支持在 `AgentExecutor` 构建时按 cwd 实例化工具。

---

## 技术架构

### 架构层次

```
┌─────────────────────────────────────┐
│     Application Layer               │  (具体应用)
├─────────────────────────────────────┤
│  rust-agent-middlewares (本库)       │  ← 具体中间件实现
│  ┌──────────────────────────────┐  │
│  │  FilesystemMiddleware        │  │
│  │    read_file                 │  │
│  │    write_file                │  │
│  │    edit_file                 │  │
│  │    glob_files                │  │
│  │    search_files_rg           │  │
│  │    folder_operations         │  │
│  ├──────────────────────────────┤  │
│  │  TerminalMiddleware          │  │
│  │    bash                      │  │
│  └──────────────────────────────┘  │
├─────────────────────────────────────┤
│     rust-create-agent               │  (框架层)
│  Middleware trait, AgentExecutor    │
└─────────────────────────────────────┘
```

### 包结构

```
rust-agent-middlewares/
├── Cargo.toml
└── src/
    ├── lib.rs                      # 模块声明 + prelude（重导出 rust-create-agent 类型）
    ├── tools/
    │   ├── mod.rs
    │   └── filesystem/
    │       ├── mod.rs
    │       ├── read.rs             # ReadFileTool
    │       ├── write.rs            # WriteFileTool
    │       ├── edit.rs             # EditFileTool
    │       ├── glob.rs             # GlobFilesTool
    │       ├── grep.rs             # SearchFilesRgTool
    │       └── folder.rs           # FolderOperationsTool
    └── middleware/
        ├── mod.rs
        ├── filesystem.rs           # FilesystemMiddleware
        └── terminal.rs             # TerminalMiddleware + BashTool
```

### Cargo.toml 依赖

```toml
[dependencies]
rust-create-agent = { path = "../rust-create-agent" }
langchain-rust = "4.6.0"
tokio = { version = "1", features = ["full", "process"] }
async-trait = "0.1"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
anyhow = "1.0"
thiserror = "2.0"
glob = "0.3"          # glob 模式匹配
walkdir = "2.4"       # 目录遍历
ignore = "0.4"        # 尊重 .gitignore

[dev-dependencies]
tokio-test = "0.4"
tempfile = "3.8"
```

---

## FilesystemMiddleware 详细设计

### 接口定义

```rust
pub struct FilesystemMiddleware;

impl FilesystemMiddleware {
    pub fn new() -> Self;

    /// 根据 cwd 构建工具列表（在 AgentExecutor 构建时调用）
    pub fn build_tools(cwd: &str) -> Vec<Box<dyn Tool>>;

    /// 返回所有工具名称（文档/日志用）
    pub fn tool_names() -> Vec<&'static str>;
}

#[async_trait]
impl<S: State> Middleware<S> for FilesystemMiddleware {
    fn name(&self) -> &str { "FilesystemMiddleware" }

    async fn before_agent(&self, state: &mut S) -> AgentResult<()>;
    // 其余钩子使用默认 no-op 实现
}
```

### 工具详细设计

#### read_file

```
输入参数：
  file_path: string    (必须) 文件路径（绝对或相对 cwd）
  offset:    number    (可选, 默认 0) 起始行号
  limit:     number    (可选, 默认 2000) 读取行数

输出格式：cat -n 格式，带行号前缀
  "     1\t内容..."
  "     2\t内容..."

特殊处理：
  - 二进制文件（.png/.pdf/.exe 等）：返回 [BINARY FILE DETECTED] 说明
  - 文件不存在：返回 "Error: File not found at <path>"
  - 路径解析：相对路径基于 cwd 解析

MAX_LINES = 2000
```

#### write_file

```
输入参数：
  file_path: string    (必须) 目标路径
  content:   string    (必须) 写入内容

行为：
  - 覆盖已有文件
  - 自动创建父目录（等同 mkdir -p）
  - 返回成功/错误信息
```

#### edit_file

```
输入参数：
  file_path:   string  (必须) 文件路径
  old_string:  string  (必须) 被替换文本
  new_string:  string  (必须) 替换后文本
  replace_all: bool    (可选, 默认 false)

唯一性校验（replace_all=false 时）：
  - 0 次出现 → "Error: old_string not found"
  - 1 次出现 → 替换成功
  - N>1 次出现 → "Error: not unique (found N occurrences). Use replace_all or provide more context"
```

#### glob_files

```
输入参数：
  pattern: string  (必须) glob 模式，如 "**/*.rs"
  path:    string  (可选) 搜索根目录（绝对或相对 cwd）

跳过目录：
  node_modules / .git / dist / build / .next / .turbo /
  coverage / .nyc_output / temp / .cache / vendor /
  venv / __pycache__ / target / out / .output

返回：绝对路径列表，按修改时间降序排列（最新优先）
     空结果 → "No files found."
```

#### search_files_rg

```
输入参数：
  args:       string[]  (必须) ripgrep 参数数组（最后一个非 flag 参数为搜索路径）
  head_limit: number    (可选, 默认 500) 输出行数限制

行为：
  - 调用系统 rg 命令（依次尝试 rg / /usr/local/bin/rg / /opt/homebrew/bin/rg）
  - 自动解析最后一个路径参数，相对路径基于 cwd 解析
  - 超时 15 秒 → 返回超时错误信息
  - 无匹配（exit code 1 + 空 stdout）→ "No matches found."

示例输入：
  {"args": ["-n", "-i", "fn main", "src/"]}
```

#### folder_operations

```
输入参数：
  operation:   "create" | "list" | "exists"  (必须)
  folder_path: string   (必须)
  recursive:   bool     (可选, 默认 true)

create:  std::fs::create_dir_all（recursive=true）或 create_dir
exists:  返回存在状态和类型（Directory / File）
list:    列出子目录和文件，含大小和修改时间；按目录/文件分组
```

---

## TerminalMiddleware 详细设计

### BashTool

```
输入参数：
  command:      string  (必须) shell 命令
  timeout_secs: number  (可选, 默认 120) 超时秒数

平台选择：
  macOS/Linux: bash -c <command>
  Windows:     cmd /C <command>

输出格式：
  stdout 内容
  [stderr]          ← 有 stderr 时附加
  stderr 内容
  [Exit code: N]    ← 非零退出码时附加

超时：返回 "Error: Command timed out after N seconds."
```

### TerminalMiddleware

```rust
pub struct TerminalMiddleware;

impl TerminalMiddleware {
    pub fn new() -> Self;
    pub fn build_tools(cwd: &str) -> Vec<Box<dyn Tool>>;
    pub fn tool_names() -> Vec<&'static str>;  // ["bash"]
}

#[async_trait]
impl<S: State> Middleware<S> for TerminalMiddleware {
    fn name(&self) -> &str { "TerminalMiddleware" }
    async fn before_agent(&self, state: &mut S) -> AgentResult<()>;
}
```

---

## cwd 传递机制

### 当前设计（v0.1）

工具在 `AgentExecutor` 构建时通过 `build_tools(cwd)` 按 cwd 实例化，cwd 固定绑定于工具实例：

```rust
let cwd = "/workspace";

let mut executor = AgentExecutor::new(llm)
    .add_middleware(Box::new(FilesystemMiddleware::new()))
    .add_middleware(Box::new(TerminalMiddleware::new()));

// 工具携带初始 cwd
for tool in FilesystemMiddleware::build_tools(cwd) {
    executor = executor.register_tool(tool);
}
for tool in TerminalMiddleware::build_tools(cwd) {
    executor = executor.register_tool(tool);
}
```

### 限制与后续改进

当前实现中，cwd 在工具实例化时固定。若 `AgentState::cwd` 在运行时发生变更，工具使用的 cwd 不会自动同步。

**后续改进方向**（Phase 2）：

- 工具通过 `Arc<RwLock<String>>` 共享可变 cwd 引用
- 或通过 `before_tool` 中间件钩子动态注入当前 cwd 到工具调用参数

---

## 与 TypeScript 版本对应关系

| TypeScript (`agent-middlewares`) | Rust (`rust-agent-middlewares`) |
| -------------------------------- | ------------------------------- |
| `FilesystemMiddleware` class     | `FilesystemMiddleware` struct   |
| `read_tool`                      | `ReadFileTool`                  |
| `write_tool`                     | `WriteFileTool`                 |
| `replace_tool`                   | `EditFileTool`                  |
| `glob_tool`                      | `GlobFilesTool`                 |
| `grep_tool`                      | `SearchFilesRgTool`             |
| `folder_tool`                    | `FolderOperationsTool`          |
| `TerminalMiddleware` class       | `TerminalMiddleware` struct     |
| `execa` bash wrapper             | `tokio::process::Command`       |
| `rgPath` (预编译二进制)          | 系统 PATH 中的 `rg`             |

### 行为差异说明

| 特性           | TypeScript                        | Rust                        | 说明                         |
| -------------- | --------------------------------- | --------------------------- | ---------------------------- |
| ripgrep 路径   | `@vscode/ripgrep` 预编译二进制    | 系统 PATH 中的 `rg`         | Rust 版依赖系统安装          |
| 二进制文件处理 | 区分 PDF / ipynb / 其他           | 仅区分二进制/文本           | PDF/ipynb 特殊解析待后续实现 |
| glob 实现      | npm `glob` 包                     | `walkdir` + `glob::Pattern` | 行为基本一致                 |
| cwd 动态更新   | 通过 `runtime.state.cwd` 实时读取 | 工具实例化时固定            | 后续改进                     |

---

## Workspace 配置

根目录 `Cargo.toml` 将两个 Rust 包纳入同一 workspace：

```toml
# /code-graph/Cargo.toml
[workspace]
members = [
    "rust-create-agent",
    "rust-agent-middlewares",
]
resolver = "2"
```

构建命令：

```bash
# 构建全部
cargo build

# 仅构建 middlewares 包
cargo build -p rust-agent-middlewares

# 运行测试
cargo test -p rust-agent-middlewares
```

---

## 使用示例

### 基础用法

```rust
use rust_agent_middlewares::prelude::*;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cwd = "/workspace";
    let llm = MockLLM::always_answer("Done!");

    let mut executor = AgentExecutor::new(llm)
        .add_middleware(Box::new(FilesystemMiddleware::new()))
        .add_middleware(Box::new(TerminalMiddleware::new()));

    // 注册工具（携带 cwd）
    for tool in FilesystemMiddleware::build_tools(cwd) {
        executor = executor.register_tool(tool);
    }
    for tool in TerminalMiddleware::build_tools(cwd) {
        executor = executor.register_tool(tool);
    }

    let mut state = AgentState::new(cwd);
    let output = executor
        .execute(AgentInput::text("列出 src/ 目录下的所有 .rs 文件"), &mut state)
        .await?;

    println!("{}", output.text);
    Ok(())
}
```

### 结合 AgentDef 声明式用法（Phase 2，依赖 rust-create-agent AgentDef）

```rust
use rust_agent_middlewares::prelude::*;

struct DefaultAgent;

impl AgentDef for DefaultAgent {
    fn id() -> &'static str { "default" }
    fn name() -> &'static str { "Jarvis" }

    fn tools() -> Vec<Box<dyn Tool>> {
        let cwd = std::env::current_dir()
            .unwrap()
            .to_string_lossy()
            .to_string();
        let mut tools = FilesystemMiddleware::build_tools(&cwd);
        tools.extend(TerminalMiddleware::build_tools(&cwd));
        tools
    }

    fn middlewares() -> Vec<Box<dyn Middleware<AgentState>>> {
        vec![
            Box::new(FilesystemMiddleware::new()),
            Box::new(TerminalMiddleware::new()),
            Box::new(LoggingMiddleware::new()),
        ]
    }
}
```

---

## 实现进度

### Phase 1: 文件系统工具 ✅

- [x] `ReadFileTool` — 行号输出、二进制检测、offset/limit
- [x] `WriteFileTool` — 覆盖写入、自动创建父目录
- [x] `EditFileTool` — 精确替换、唯一性校验、replace_all
- [x] `GlobFilesTool` — glob 模式、跳过构建目录、按修改时间排序
- [x] `SearchFilesRgTool` — 包装 rg、15s 超时、500 行限制
- [x] `FolderOperationsTool` — create / list / exists

### Phase 2: 中间件封装 ✅

- [x] `FilesystemMiddleware` — `build_tools(cwd)` 工厂、`Middleware<S>` 实现
- [x] `TerminalMiddleware` + `BashTool` — 跨平台、120s 超时

### Phase 3: Workspace 配置 ✅

- [x] 根目录 `Cargo.toml` workspace
- [x] 编译验证通过

### Phase 4: 测试覆盖（待完成）

- [ ] `ReadFileTool` 单元测试（正常读取、不存在文件、二进制检测、offset/limit）
- [ ] `WriteFileTool` 单元测试（写入、父目录自动创建）
- [ ] `EditFileTool` 单元测试（替换成功、不唯一报错、replace_all）
- [ ] `GlobFilesTool` 单元测试（模式匹配、跳过目录）
- [ ] `FolderOperationsTool` 单元测试（三种操作）
- [ ] `BashTool` 集成测试（简单命令、超时）
- [ ] `FilesystemMiddleware` 中间件钩子测试

### Phase 5: cwd 动态同步（待规划）

- [ ] 工具通过共享引用读取运行时 cwd
- [ ] 或 `before_tool` 钩子注入当前 cwd

### Phase 6: 功能补全（待规划）

- [ ] `ReadFileTool` — PDF 提取（使用 `pdf-extract` crate）
- [ ] `ReadFileTool` — Jupyter Notebook 解析
- [ ] `GlobFilesTool` — 尊重 `.gitignore`（使用 `ignore` crate）
- [ ] `SearchFilesRgTool` — 内嵌 ripgrep 库（无需系统安装）

---

## 后续扩展方向

1. **内嵌 ripgrep** — 使用 `grep-searcher` / `grep-regex` crate，消除系统 `rg` 依赖
2. **cwd 动态绑定** — `Arc<RwLock<String>>` 共享 cwd，运行时同步
3. **沙箱保护** — 路径越界检查，防止访问 cwd 外部文件（对应 TypeScript HITL 工作区检查）
4. **流式读取** — 大文件分块读取，避免内存峰值
5. **WASM 支持** — 编译为 WASM，支持浏览器环境下的文件系统访问（File System Access API）

---

## 参考资料

- TypeScript 参考: `packages/agent-middlewares/src/filesystem.ts`
- 框架层文档: `specs/rust-create-agent-design.md`
- langchain-rust Tool trait: <https://docs.rs/langchain-rust>
- walkdir: <https://docs.rs/walkdir>
- glob: <https://docs.rs/glob>

---

**文档版本**: v0.1.0  
**最后更新**: 2026-03-16  
**状态**: 开发中

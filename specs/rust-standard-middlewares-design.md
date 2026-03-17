# Rust Standard Middlewares 设计文档

## 概述

`rust-standard-middlewares` 是框架层中间件的 Rust 实现，对应 TypeScript `packages/standard-agent/src/middlewares/`
中的高层中间件。与专注于文件系统/终端工具的 `rust-agent-middlewares`
不同，本层负责 Agent 的**认知增强**（Skills、AGENTS.md）和**运行安全**（HumanInTheLoop）。

**版本**: v0.1.0 **状态**: 待实现 **对齐目标**: `packages/standard-agent/src/middlewares/` (TypeScript) **基础框架**:
`rust-create-agent`（本 monorepo） **已有参考**: `specs/rust-agent-middlewares-design.md`（具体工具层）

---

## 架构层次

```
┌──────────────────────────────────────────────┐
│  rust-agent-tui (应用层)                       │
│  rust-agent-server (未来的应用层)              │
├──────────────────────────────────────────────┤
│  rust-standard-middlewares (本库)  ← 框架中间件│
│  ┌─────────────────────────────────────────┐ │
│  │  AgentsMdMiddleware                     │ │
│  │  SkillsMiddleware                       │ │
│  │  HumanInTheLoopMiddleware               │ │
│  │  AnthropicCacheMiddleware               │ │
│  └─────────────────────────────────────────┘ │
├──────────────────────────────────────────────┤
│  rust-agent-middlewares (工具层)               │
│  FilesystemMiddleware, TerminalMiddleware     │
├──────────────────────────────────────────────┤
│  rust-create-agent (框架层)                    │
│  Middleware trait, AgentExecutor             │
└──────────────────────────────────────────────┘
```

---

## 包结构

```
rust-standard-middlewares/
├── Cargo.toml
└── src/
    ├── lib.rs                          # 模块声明 + prelude
    ├── agents_md.rs                    # AgentsMdMiddleware
    ├── skills/
    │   ├── mod.rs                      # SkillsMiddleware
    │   └── loader.rs                   # SKILL.md 加载器
    ├── hitl/
    │   ├── mod.rs                      # HumanInTheLoopMiddleware
    │   └── handler.rs                  # 审批回调 trait
    └── cache.rs                        # AnthropicCacheMiddleware
```

### Cargo.toml 依赖

```toml
[package]
name = "rust-standard-middlewares"
version = "0.1.0"
edition = "2021"

[dependencies]
rust-create-agent = { path = "../rust-create-agent" }
tokio = { version = "1", features = ["full"] }
async-trait = "0.1"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
anyhow = "1"
thiserror = "2"
gray_matter = "0.2"       # YAML frontmatter 解析（SKILL.md）
glob = "0.3"              # 文件搜索

[dev-dependencies]
tokio-test = "0.4"
tempfile = "3.8"
```

---

## 一、AgentsMdMiddleware

### TypeScript 参考

```
packages/standard-agent/src/middlewares/agentsMD.ts
```

### 功能说明

在 `before_agent` 时，从工作目录（按优先级）寻找项目指引文件，将其内容注入到消息历史的**系统提示词**位置。

### 搜索文件优先级

```
1. {cwd}/AGENTS.md
2. {cwd}/CLAUDE.md
3. {cwd}/.claude/AGENTS.md
4. {home}/.claude/AGENTS.md   （用户全局）
```

第一个找到即停止。若均不存在，则不注入任何内容。

### Rust 接口

```rust
pub struct AgentsMdMiddleware {
    /// 额外的搜索路径（应用层可注入）
    extra_search_paths: Vec<PathBuf>,
}

impl AgentsMdMiddleware {
    pub fn new() -> Self;
    /// 添加额外搜索路径
    pub fn with_extra_paths(mut self, paths: Vec<PathBuf>) -> Self;
}

#[async_trait]
impl<S: State> Middleware<S> for AgentsMdMiddleware {
    fn name(&self) -> &str { "AgentsMdMiddleware" }

    async fn before_agent(&self, state: &mut S) -> AgentResult<()> {
        // 从 state.cwd() 解析搜索路径
        // 找到文件后，prepend 系统消息到 state.messages
    }
}
```

### 注入格式

```
[AGENTS.md 内容，原文注入，不做截断]
```

系统消息以 `BaseMessage::system(content)` 前插到消息历史，置于 Human 消息之前。

---

## 二、SkillsMiddleware

### TypeScript 参考

```
packages/standard-agent/src/middlewares/skills/index.ts
packages/standard-agent/src/middlewares/skills/load.ts
```

### 功能说明

实现**渐进式 Skills 披露**：

1. `before_agent`：扫描 Skills 目录，将所有 skill 的 `name` + `description`
   注入系统提示词（摘要列表），并告知 LLM"如需使用某 skill，在消息中提及其名称"
2. `before_tool`（可选）：若 LLM 调用了 `load_skill` 工具，则加载完整 skill 内容并附加到下一轮消息

> 当前 Phase 1 仅实现 `before_agent` 摘要注入，不实现 `load_skill` 工具（该工具属应用层）。

### SKILL.md 格式

```markdown
---
name: 'my-skill'
description: '该 skill 的功能描述'
---

# My Skill

说明内容...
```

### Skills 搜索路径

```
1. {cwd}/.claude/skills/      （项目级）
2. {home}/.claude/code/skills/ （用户级）
```

两者均加载，合并去重（同名时项目级优先）。

### Rust 接口

```rust
pub struct SkillMetadata {
    pub name: String,
    pub description: String,
    pub path: PathBuf,
}

pub struct SkillsMiddleware {
    project_skills_dir: Option<PathBuf>,   // 默认 {cwd}/.claude/skills/
    user_skills_dir: Option<PathBuf>,      // 默认 {home}/.claude/code/skills/
}

impl SkillsMiddleware {
    pub fn new() -> Self;
    pub fn with_project_dir(mut self, dir: PathBuf) -> Self;
    pub fn with_user_dir(mut self, dir: PathBuf) -> Self;
}

/// 加载单个 SKILL.md，解析 frontmatter
pub fn load_skill_metadata(path: &Path) -> Option<SkillMetadata>;

/// 扫描目录，返回所有可用 skill 元数据
pub fn list_skills(dirs: &[PathBuf]) -> Vec<SkillMetadata>;

#[async_trait]
impl<S: State> Middleware<S> for SkillsMiddleware {
    fn name(&self) -> &str { "SkillsMiddleware" }

    async fn before_agent(&self, state: &mut S) -> AgentResult<()> {
        // 1. 从 state.cwd() 解析目录
        // 2. list_skills() 扫描两级目录
        // 3. 若有 skills，生成摘要系统消息并 prepend
    }
}
```

### 系统消息格式

```
你可以使用以下 Skills（专项能力），在需要时提及其名称：

- **codebase-exploration**: 代码库深度搜索
- **tui-development**: 构建 TUI（终端 UI）应用
- **tanstack-query**: React TanStack Query v5 服务端状态管理

如需加载某 skill 的完整内容，在消息中提及其 name 即可。
```

---

## 三、HumanInTheLoopMiddleware（HITL）

### TypeScript 参考

```
packages/standard-agent/src/middlewares/hitl.ts
```

### 功能说明

在 `before_tool` 时拦截敏感工具调用，要求用户确认后才执行。

### 敏感工具规则（默认）

| 规则类型   | 匹配逻辑                         | 示例             |
| ---------- | -------------------------------- | ---------------- |
| 精确工具名 | `tool_name == "bash"`            | bash（所有命令） |
| 工具名前缀 | `tool_name.starts_with("write")` | write_file       |
| 自定义函数 | 应用层注入的闭包                 | 业务特定规则     |

> **设计重点**：不硬编码规则，通过依赖注入让应用层决定哪些工具需要确认。

### 确认决策类型

```rust
#[derive(Debug, Clone)]
pub enum HitlDecision {
    /// 批准执行（原始参数）
    Approve,
    /// 编辑后执行（修改工具调用参数）
    Edit(serde_json::Value),
    /// 拒绝执行
    Reject,
    /// 拒绝并回复 LLM
    Respond(String),
}
```

### 审批回调 Trait

```rust
#[async_trait]
pub trait HitlHandler: Send + Sync {
    /// 判断此工具调用是否需要审批
    fn requires_approval(&self, tool_name: &str, input: &serde_json::Value) -> bool;

    /// 请求用户审批，返回决策
    async fn request_approval(
        &self,
        tool_name: &str,
        input: &serde_json::Value,
    ) -> HitlDecision;
}
```

### Rust 接口

```rust
pub struct HumanInTheLoopMiddleware {
    handler: Arc<dyn HitlHandler>,
    /// 全局开关：若为 false，所有工具调用直接放行（对应 YOLO_MODE）
    enabled: bool,
}

impl HumanInTheLoopMiddleware {
    pub fn new(handler: Arc<dyn HitlHandler>) -> Self;
    pub fn disabled() -> Self;   // YOLO 模式
}

#[async_trait]
impl<S: State> Middleware<S> for HumanInTheLoopMiddleware {
    fn name(&self) -> &str { "HumanInTheLoopMiddleware" }

    async fn before_tool(
        &self,
        state: &mut S,
        tool_call: &ToolCall,
    ) -> AgentResult<ToolCall> {
        if !self.enabled { return Ok(tool_call.clone()); }

        if !self.handler.requires_approval(&tool_call.name, &tool_call.input) {
            return Ok(tool_call.clone());
        }

        match self.handler.request_approval(&tool_call.name, &tool_call.input).await {
            HitlDecision::Approve => Ok(tool_call.clone()),
            HitlDecision::Edit(new_input) => {
                let mut modified = tool_call.clone();
                modified.input = new_input;
                Ok(modified)
            }
            HitlDecision::Reject => Err(AgentError::ToolRejected {
                tool: tool_call.name.clone(),
                reason: "用户拒绝".to_string(),
            }),
            HitlDecision::Respond(msg) => Err(AgentError::ToolRejected {
                tool: tool_call.name.clone(),
                reason: msg,
            }),
        }
    }
}
```

### TUI 内置实现（DefaultTuiHitlHandler）

为 `rust-agent-tui` 提供基于 TUI 弹窗的 HITL 实现，通过 `tokio::sync::oneshot` 挂起 Agent 等待用户输入：

```rust
/// TUI 层实现（在 rust-agent-tui 中，不在本库中）
pub struct TuiHitlHandler {
    /// 向 TUI 发送审批请求
    approval_tx: mpsc::Sender<ApprovalRequest>,
}

pub struct ApprovalRequest {
    pub tool_name: String,
    pub input: serde_json::Value,
    pub response_tx: oneshot::Sender<HitlDecision>,
}
```

---

## 四、AnthropicCacheMiddleware

### TypeScript 参考

```
packages/standard-agent/src/middlewares/anthropicCache.ts
```

### 功能说明

对 Anthropic Claude API 启用**提示词缓存**（Prompt Caching），在最后一条用户消息上添加
`cache_control: { type: "ephemeral" }` 元数据，降低重复调用成本。

### 适用条件

- 仅 Anthropic provider 有效（OpenAI 忽略此元数据）
- 不改变消息内容，仅修改消息元数据

### Rust 接口

> **依赖**: Anthropic SDK 对 Rust 的支持，或通过 HTTP 直接调用。若框架不支持 `cache_control`，此中间件为 no-op。

```rust
pub struct AnthropicCacheMiddleware;

impl AnthropicCacheMiddleware {
    pub fn new() -> Self;
}

#[async_trait]
impl<S: State> Middleware<S> for AnthropicCacheMiddleware {
    fn name(&self) -> &str { "AnthropicCacheMiddleware" }

    async fn before_agent(&self, state: &mut S) -> AgentResult<()> {
        // 在最后一条消息（Human）上标记 cache_control
        // 具体实现依赖底层 LLM 消息类型的扩展字段
    }
}
```

> **优先级**: Phase 2 实现，依赖 LLM 层的 Anthropic 特定扩展。

---

## 与 TypeScript 版本对应关系

| TypeScript (`standard-agent`) | Rust (`rust-standard-middlewares`) | 状态    |
| ----------------------------- | ---------------------------------- | ------- |
| `AgentsMdMiddleware`          | `AgentsMdMiddleware`               | 待实现  |
| `SkillsMiddleware`            | `SkillsMiddleware`                 | 待实现  |
| `HumanInTheLoopMiddleware`    | `HumanInTheLoopMiddleware`         | 待实现  |
| `AnthropicCacheMiddleware`    | `AnthropicCacheMiddleware`         | Phase 2 |
| `MemoriesMiddleware`          | 不实现                             | -       |
| `MCPMiddleware`               | 不在本包范围（独立规划）           | -       |
| `SubAgentsMiddleware`         | 不在本包范围（独立规划）           | -       |

---

## 中间件组合示例

### rust-agent-tui 完整中间件栈

```rust
use rust_create_agent::prelude::*;
use rust_agent_middlewares::prelude::*;
use rust_standard_middlewares::prelude::*;

let cwd = std::env::current_dir().unwrap().to_string_lossy().to_string();

let hitl_handler = Arc::new(TuiHitlHandler::new(approval_tx));

let executor = AgentExecutor::new(llm)
    .max_iterations(500)
    // 认知增强层（before_agent 顺序注入）
    .add_middleware(Box::new(AgentsMdMiddleware::new()))
    .add_middleware(Box::new(SkillsMiddleware::new()))
    // 安全层
    .add_middleware(Box::new(HumanInTheLoopMiddleware::new(hitl_handler)))
    // 工具层
    .add_middleware(Box::new(FilesystemMiddleware::new()))
    .add_middleware(Box::new(TerminalMiddleware::new()));

// 注册工具
for tool in FilesystemMiddleware::build_tools(&cwd) {
    executor = executor.register_tool(tool);
}
for tool in TerminalMiddleware::build_tools(&cwd) {
    executor = executor.register_tool(tool);
}
```

### YOLO 模式（禁用 HITL）

```rust
// 通过环境变量控制
let hitl = if std::env::var("YOLO_MODE").is_ok() {
    HumanInTheLoopMiddleware::disabled()
} else {
    HumanInTheLoopMiddleware::new(handler)
};
```

---

## 消息注入顺序

多个 `before_agent` 中间件均会 prepend 系统消息，执行顺序决定最终消息顺序：

```
[注册顺序]          [最终消息历史]
AgentsMdMiddleware  → System: [AGENTS.md 内容]
SkillsMiddleware    → System: [Skills 摘要]
                    → Human: 用户输入
```

> **注意**：TypeScript 版本通过 `wrapModelCall` 在调用前修改 request，Rust 版本通过 `before_agent`
> 向 state 添加系统消息实现等效效果。若 `rust-create-agent` 未来支持 `wrap_model_call` 钩子，可迁移到更精确的实现。

---

## Workspace 配置

根目录 `Cargo.toml` 新增成员：

```toml
[workspace]
members = [
    "rust-create-agent",
    "rust-agent-middlewares",
    "rust-standard-middlewares",   # ← 新增
    "rust-agent-tui",
]
resolver = "2"
```

---

## 实现进度规划

### Phase 1：上下文注入中间件（优先实现）

- [ ] `AgentsMdMiddleware`（无外部依赖，纯文件读取）
- [ ] `SkillsMiddleware` loader（需 `gray_matter` 解析 frontmatter）
- [ ] `SkillsMiddleware` 中间件封装

### Phase 2：安全中间件

- [ ] `HitlDecision` 枚举 + `HitlHandler` trait
- [ ] `HumanInTheLoopMiddleware` 核心逻辑
- [ ] 需在 `rust-create-agent` 中新增 `AgentError::ToolRejected` 变体
- [ ] `TuiHitlHandler`（在 `rust-agent-tui` 中实现，本库仅定义 trait）

### Phase 3：缓存优化

- [ ] `AnthropicCacheMiddleware`（依赖 LLM 层扩展）

---

## 关键设计决策

### 1. 消息注入方式

**TypeScript**：通过 `wrapModelCall` 在每次 LLM 调用前动态修改 request **Rust（当前）**：通过 `before_agent`
向 state 添加系统消息

**权衡**：`before_agent` 只执行一次，若会话有多轮（续话场景）需注意重复注入。后续可在 `rust-create-agent` 中新增
`wrap_model_call` 钩子解决。

### 2. HITL 异步挂起

TypeScript 通过 LangGraph `interrupt()` 实现 HITL 挂起。Rust 无 LangGraph 依赖，改用 `tokio::sync::oneshot` channel：

```
Agent goroutine          TUI goroutine
     |                        |
 before_tool                  |
     |--- ApprovalRequest -->  |
     |     (oneshot tx)        | 渲染确认弹窗
     |                        | 等待用户输入
     |<-- HitlDecision -----  |
     |     (oneshot rx)        |
 继续/拒绝                     |
```

### 3. 路径解析策略

所有路径参数若为相对路径，均基于 `state.cwd()` 解析，保持与 TypeScript 版本一致的行为。

---

## 参考资料

- TypeScript 参考: `packages/standard-agent/src/middlewares/`
- 框架层文档: `specs/rust-create-agent-design.md`
- 具体工具层文档: `specs/rust-agent-middlewares-design.md`
- gray_matter crate: <https://crates.io/crates/gray_matter>
- tokio oneshot: <https://docs.rs/tokio/latest/tokio/sync/oneshot/index.html>

---

**文档版本**: v0.1.0 **最后更新**: 2026-03-17 **状态**: 待实现

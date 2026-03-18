# 方案：FilesystemMiddleware 工具自注册

**状态**: 待实施 **优先级**: 高 **背景**: 代码审查 #7 — `FilesystemMiddleware` / `TerminalMiddleware`
无法通过中间件系统自动注册工具，调用方必须手动调用 `build_tools(cwd)` 并传递给 `AgentExecutor`，职责断裂

---

## 问题描述

TypeScript 侧中间件实现 `getTools()` 方法，框架自动收集所有中间件的工具并注入 Agent。

Rust 侧的 `FilesystemMiddleware::build_tools(cwd)` 是静态方法，与中间件实例完全脱节：

```rust
// 现状：调用方负责手动创建工具并传给 executor
let tools = FilesystemMiddleware::build_tools(&cwd)  // 静态调用，不经过中间件
    .into_iter()
    .chain(TerminalMiddleware::build_tools(&cwd))
    .collect();

executor.register_tool(tool);  // 手动逐个注册
```

这导致：

1. 中间件和其提供的工具在运行时是断开的两条路径
2. 新增工具必须同时修改 `build_tools` 和调用侧，容易漏改
3. 无法根据中间件实例的配置（如 cwd）动态决定工具列表

---

## 目标

中间件能够声明自己提供哪些工具，框架自动在 `before_agent` 阶段完成注册，调用方不需要关心工具来自哪个中间件。

---

## 方案设计

### 核心思路：ToolProvider sub-trait

引入可选的 `ToolProvider` trait，让实现了工具注册能力的中间件声明自己的工具，框架自动收集并注册。

### Step 1：定义 ToolProvider trait

在 `rust-create-agent/src/middleware/trait.rs` 中新增（不改动现有 `Middleware` trait）：

```rust
/// 可选 trait：中间件声明其提供的工具列表
///
/// 实现了此 trait 的中间件，其工具会在 AgentExecutor 初始化时
/// 通过 `collect_tools(cwd)` 自动收集并注册。
pub trait ToolProvider {
    /// 根据工作目录返回该中间件提供的工具列表
    fn collect_tools(&self, cwd: &str) -> Vec<Box<dyn BaseTool>>;
}
```

### Step 2：FilesystemMiddleware 和 TerminalMiddleware 实现 ToolProvider

```rust
// rust-agent-middlewares/src/middleware/filesystem.rs
impl ToolProvider for FilesystemMiddleware {
    fn collect_tools(&self, cwd: &str) -> Vec<Box<dyn BaseTool>> {
        Self::build_tools(cwd)  // 复用现有静态方法
    }
}

// rust-agent-middlewares/src/middleware/terminal.rs
impl ToolProvider for TerminalMiddleware {
    fn collect_tools(&self, cwd: &str) -> Vec<Box<dyn BaseTool>> {
        Self::build_tools(cwd)
    }
}
```

### Step 3：MiddlewareChain 感知 ToolProvider

`MiddlewareChain` 需要能查询所有实现了 `ToolProvider` 的中间件。

由于 Rust trait object 不支持向下转型（`Box<dyn Middleware>` 无法转成 `Box<dyn ToolProvider>`），有两种实现方式：

#### 方案 A：合并 trait（推荐）

修改 `Middleware` trait，添加可选的 `collect_tools` 方法（默认返回空）：

```rust
#[async_trait]
pub trait Middleware<S: State>: Send + Sync {
    fn name(&self) -> &str;

    // 新增：工具提供接口，默认返回空（不强制实现）
    fn collect_tools(&self, _cwd: &str) -> Vec<Box<dyn BaseTool>> {
        vec![]
    }

    async fn before_agent(&self, state: &mut S) -> AgentResult<()> { Ok(()) }
    async fn before_tool(&self, state: &mut S, tool_call: &ToolCall) -> AgentResult<ToolCall> {
        Ok(tool_call.clone())
    }
    // ... 其余钩子不变
}
```

优点：无需 trait object 转换，实现最简单，向后兼容（默认返回空）。缺点：将工具注册逻辑放入 `Middleware`
trait，轻微违反单一职责。

#### 方案 B：独立注册表（备选）

`MiddlewareChain` 维护两个列表：

- `middlewares: Vec<Box<dyn Middleware<S>>>`（现有）
- `tool_providers: Vec<Box<dyn ToolProvider>>`（新增）

`add` 方法不变，新增 `add_tool_provider` 方法。

优点：职责更清晰。缺点：注册中间件和注册工具提供者需要调用两次，容易漏掉。

**推荐方案 A**，因为 `collect_tools` 默认返回空，对现有中间件完全无感知，且调用侧只需要一次 `add_middleware` 调用。

### Step 4：AgentExecutor 自动收集中间件工具

```rust
impl<L: ReactLLM, S: State> AgentExecutor<L, S> {
    pub async fn execute(&self, input: AgentInput, state: &mut S) -> AgentResult<AgentOutput> {
        // 新增：从中间件收集工具，与手动注册的工具合并
        let middleware_tools: Vec<Box<dyn BaseTool>> = self.chain
            .middlewares
            .iter()
            .flat_map(|m| m.collect_tools(state.cwd()))
            .collect();

        // 合并到工具查找表（手动注册的优先，不覆盖同名工具）
        let mut all_tools: HashMap<String, &dyn BaseTool> = middleware_tools
            .iter()
            .map(|t| (t.name().to_string(), t.as_ref()))
            .collect();

        for (name, tool) in &self.tools {
            all_tools.entry(name.clone()).or_insert(tool.as_ref());
        }

        // ... 后续执行逻辑使用 all_tools
    }
}
```

> 注意：`middleware_tools` 的生命周期需要与 `execute` 调用绑定。

### Step 5：更新调用侧

TUI 侧 `run_universal_agent` 不再需要手动创建工具：

```rust
// 改动前
let tools: Vec<Arc<dyn BaseTool>> = FilesystemMiddleware::build_tools(&cwd)
    .into_iter()
    .chain(TerminalMiddleware::build_tools(&cwd))
    .map(Arc::from)
    .collect();

// 改动后
// 工具由中间件自动提供，调用侧无需关心
let executor = AgentExecutor::new(model)
    .add_middleware(Box::new(FilesystemMiddleware::new()))   // 自动提供 6 个文件系统工具
    .add_middleware(Box::new(TerminalMiddleware::new()))     // 自动提供 bash 工具
    .add_middleware(Box::new(hitl));
```

---

## LLM 工具列表同步

`ReactLLM::generate_reasoning` 接收 `tools: &[&dyn BaseTool]` 用于生成 tool_use 请求。当前这个列表在 `AgentExecutor` 的
`execute` 方法内从 `self.tools` 构建，需要同时包含中间件工具：

```rust
// 原来
let tool_refs: Vec<&dyn BaseTool> = self.tools.values().map(|t| t.as_ref()).collect();

// 改动后：合并中间件工具
let tool_refs: Vec<&dyn BaseTool> = all_tools.values().copied().collect();
```

---

## 改动范围

| 文件                                                  | 改动类型 | 说明                                                                        |
| ----------------------------------------------------- | -------- | --------------------------------------------------------------------------- |
| `rust-create-agent/src/middleware/trait.rs`           | 修改     | `Middleware` trait 新增 `collect_tools` 默认方法                            |
| `rust-create-agent/src/agent/executor.rs`             | 修改     | execute 中合并中间件工具到工具查找表和 LLM 工具列表                         |
| `rust-agent-middlewares/src/middleware/filesystem.rs` | 修改     | 实现 `collect_tools`                                                        |
| `rust-agent-middlewares/src/middleware/terminal.rs`   | 修改     | 实现 `collect_tools`                                                        |
| `rust-agent-tui/src/app/agent.rs`                     | 修改     | 删除手动 build_tools 调用（依赖 #rust-agent-executor-streaming 方案先完成） |

---

## 不改动的部分

- `FilesystemMiddleware::build_tools` 静态方法保留（向后兼容）
- `TerminalMiddleware::build_tools` 静态方法保留（向后兼容）
- 现有工具 struct 实现不变
- `AgentExecutor::register_tool` 保留（支持应用层额外工具）

---

## 与 #rust-agent-executor-streaming 的依赖关系

两个方案**相互独立**，可以单独实施：

- 本方案（工具自注册）可以先于流式方案实施，不需要等 TUI 重构完成
- 流式方案（TUI 使用 AgentExecutor）实施后，TUI 侧调用代码自然简化
- 推荐执行顺序：**先做本方案**（改动更小、风险更低），再做流式方案

---

## 验收标准

- [ ] `FilesystemMiddleware` 和 `TerminalMiddleware` 通过 `collect_tools` 提供工具
- [ ] `AgentExecutor` 执行时自动合并中间件工具，LLM 能看到完整工具列表
- [ ] 手动 `register_tool` 与中间件工具同名时，手动注册的优先
- [ ] 现有 36 个测试全部通过
- [ ] 新增集成测试：通过 `add_middleware(FilesystemMiddleware)` 自动获得文件系统工具

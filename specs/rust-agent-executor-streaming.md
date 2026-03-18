# 方案：让 TUI 使用 AgentExecutor（流式回调支持）

**状态**: 待实施 **优先级**: 高 **背景**: 代码审查 #12 — `rust-agent-tui` 完全绕过
`AgentExecutor`，自行实现了重复的 ReAct 循环

---

## 问题描述

`rust-create-agent` 精心设计了 `AgentExecutor` + 中间件链，但 `rust-agent-tui/src/app/agent.rs` 中的
`run_universal_agent` 完全没有使用它，自己手写了一个 500 轮 for 循环，重复实现了：

- 工具调用分发
- HITL 拦截
- 消息历史管理
- 错误处理

**根本原因**：`AgentExecutor::execute` 是一次性返回 `AgentOutput` 的接口，TUI 需要逐块推送 `AssistantChunk`
事件，无法用现有接口实现增量 UI 更新。

---

## 目标

让 TUI 通过 `AgentExecutor` + 中间件链运行，不再维护独立的执行循环，同时保留流式 UI 更新能力。

---

## 方案设计

### 核心思路：事件回调注入

在 `AgentExecutor` 中引入可选的 **事件回调**（`on_event`），在关键节点发出事件，而不改变主流程结构。

### Step 1：定义 AgentEvent trait

在 `rust-create-agent/src/agent/events.rs` 新增：

```rust
/// Agent 执行过程中的增量事件
pub enum AgentEvent {
    /// LLM 输出文字块（流式）
    TextChunk(String),
    /// 工具调用开始（工具名 + 参数）
    ToolStart { name: String, input: serde_json::Value },
    /// 工具调用结束（结果或错误）
    ToolEnd { name: String, output: String, is_error: bool },
    /// 一轮 ReAct 步骤完成
    StepDone { step: usize },
}

/// 事件回调 trait（应用层实现）
pub trait AgentEventHandler: Send + Sync {
    fn on_event(&self, event: AgentEvent);
}

/// 函数闭包适配器，方便快速实现
pub struct FnEventHandler<F: Fn(AgentEvent) + Send + Sync>(pub F);

impl<F: Fn(AgentEvent) + Send + Sync> AgentEventHandler for FnEventHandler<F> {
    fn on_event(&self, event: AgentEvent) {
        (self.0)(event)
    }
}
```

### Step 2：AgentExecutor 添加 event_handler 字段

```rust
pub struct AgentExecutor<L, S>
where
    L: ReactLLM,
    S: State,
{
    llm: L,
    tools: HashMap<String, Box<dyn BaseTool>>,
    chain: MiddlewareChain<S>,
    max_iterations: usize,
    // 新增：可选事件回调
    event_handler: Option<Arc<dyn AgentEventHandler>>,
}

impl<L: ReactLLM, S: State> AgentExecutor<L, S> {
    // 新增 builder 方法
    pub fn with_event_handler(mut self, handler: Arc<dyn AgentEventHandler>) -> Self {
        self.event_handler = Some(handler);
        self
    }

    fn emit(&self, event: AgentEvent) {
        if let Some(h) = &self.event_handler {
            h.on_event(event);
        }
    }
}
```

### Step 3：在 execute 关键位置发出事件

在 `executor.rs` 的 ReAct 循环中插入 `emit` 调用：

```rust
// 工具调用前
self.emit(AgentEvent::ToolStart {
    name: modified_call.name.clone(),
    input: modified_call.input.clone(),
});

// 工具调用后
self.emit(AgentEvent::ToolEnd {
    name: modified_call.name.clone(),
    output: result.output.clone(),
    is_error: result.is_error,
});

// 最终答案
self.emit(AgentEvent::TextChunk(answer.clone()));
```

### Step 4：TUI 侧重构 run_universal_agent

删除现有手写循环，改为：

```rust
pub async fn run_universal_agent(
    provider: LlmProvider,
    tools: Vec<Arc<dyn BaseTool>>,
    input: String,
    cwd: String,
    system_prompt: String,
    approval_tx: mpsc::Sender<ApprovalEvent>,
    tx: mpsc::Sender<AgentEvent>,
) {
    let tx_clone = tx.clone();

    // 事件处理器：将 executor 事件转发给 TUI channel
    let handler = FnEventHandler(move |event| {
        let _ = match event {
            AgentEvent::ToolStart { name, input } => {
                tx_clone.try_send(TuiEvent::ToolCall {
                    name,
                    display: format_tool_call_display(&name, &input),
                    is_error: false,
                })
            }
            AgentEvent::TextChunk(text) => {
                tx_clone.try_send(TuiEvent::AssistantChunk(text))
            }
            _ => Ok(()),
        };
    });

    let model = BaseModelReactLLM::new(provider.into_model())
        .with_system(system_prompt);

    let hitl = HumanInTheLoopMiddleware::from_env(TuiHitlHandler::new(approval_tx));

    let mut executor = AgentExecutor::new(model)
        .max_iterations(500)
        .with_event_handler(Arc::new(handler))
        .add_middleware(Box::new(AgentsMdMiddleware::new()))
        .add_middleware(Box::new(SkillsMiddleware::new()))
        .add_middleware(Box::new(hitl));

    for tool in tools {
        executor = executor.register_tool(tool_arc_to_box(tool));
    }

    let mut state = AgentState::new(cwd);

    match executor.execute(AgentInput::text(input), &mut state).await {
        Ok(_) => { let _ = tx.send(TuiEvent::Done).await; }
        Err(e) => { let _ = tx.send(TuiEvent::Error(e.to_string())).await; }
    }
}
```

---

## 需要处理的细节

### ask_user 工具的特殊处理

`ask_user` 不是普通工具，需要在 HITL 层拦截并走 AskUser 流程。两种方案：

**方案 A**：将 `ask_user` 注册为普通 `BaseTool`，工具的 `invoke` 内部通过 channel 挂起等待 TUI 答案。

```rust
pub struct AskUserTool {
    handler: Arc<TuiAskUserHandler>,
}

#[async_trait]
impl BaseTool for AskUserTool {
    async fn invoke(&self, input: Value) -> Result<String, Box<dyn Error + Send + Sync>> {
        let q = parse_ask_user_input(input)?;
        let answers = self.handler.ask_batch(vec![q]).await;
        Ok(answers.into_iter().next().unwrap_or_default())
    }
}
```

**方案 B**：在 `before_tool` 中间件中识别 `ask_user` 调用，挂起等待，返回修改后的 `ToolCall`（将答案注入 input）。

推荐 **方案 A**，更符合现有工具系统设计，不需要修改中间件接口。

### Arc<dyn BaseTool> vs Box<dyn BaseTool>

当前 TUI 中工具用 `Arc` 包装（多处 clone），而 `AgentExecutor` 接受 `Box`。需要一个转换辅助：

```rust
fn arc_tool_to_box(tool: Arc<dyn BaseTool>) -> Box<dyn BaseTool> {
    // 通过 newtype wrapper 实现
    Box::new(ArcToolWrapper(tool))
}

struct ArcToolWrapper(Arc<dyn BaseTool>);
#[async_trait]
impl BaseTool for ArcToolWrapper { /* 透传 */ }
```

---

## 改动范围

| 文件                                                | 改动类型 | 说明                                                  |
| --------------------------------------------------- | -------- | ----------------------------------------------------- |
| `rust-create-agent/src/agent/events.rs`             | 新增     | AgentEvent、AgentEventHandler、FnEventHandler         |
| `rust-create-agent/src/agent/executor.rs`           | 修改     | 添加 event_handler 字段、emit 方法、在循环中插入 emit |
| `rust-create-agent/src/agent/mod.rs`                | 修改     | 导出 events 模块                                      |
| `rust-create-agent/src/lib.rs`                      | 修改     | prelude 导出新类型                                    |
| `rust-agent-middlewares/src/tools/ask_user_tool.rs` | 新增     | AskUserTool（BaseTool 实现）                          |
| `rust-agent-tui/src/app/agent.rs`                   | 重写     | 改用 AgentExecutor，删除手写循环                      |

---

## 不改动的部分

- `Middleware` trait 接口不变
- `ReactLLM` trait 接口不变
- `BaseTool` trait 接口不变
- TUI 的 `AppEvent` channel 结构不变
- HITL 弹窗交互逻辑不变

---

## 验收标准

- [ ] `run_universal_agent` 中不再有手写 for 循环
- [ ] TUI 的 AssistantChunk / ToolCall / Done / Error 事件正常触发
- [ ] HITL 弹窗、AskUser 弹窗功能保持不变
- [ ] AgentsMdMiddleware、SkillsMiddleware 仍通过 AgentExecutor 的中间件链执行
- [ ] 现有 36 个测试全部通过

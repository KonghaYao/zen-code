use std::sync::Arc;
use tokio::sync::mpsc;

use rust_create_agent::agent::events::{AgentEvent as ExecutorEvent, FnEventHandler};
use rust_create_agent::agent::state::AgentState;
use rust_create_agent::agent::AgentExecutor;
use rust_create_agent::llm::BaseModelReactLLM;
use rust_create_agent::agent::react::AgentInput;
use rust_create_agent::tools::{BaseTool, ToolDefinition};
use rust_agent_middlewares::prelude::*;
use rust_agent_middlewares::tools::{AskUserInvoker, AskUserTool};
pub(crate) use super::provider::LlmProvider;
use super::hitl::{ApprovalEvent, TuiAskUserHandler, TuiHitlHandler};
use super::AgentEvent;

// ─── ArcToolWrapper ───────────────────────────────────────────────────────────

/// 将 Arc<dyn BaseTool> 包装为 Box<dyn BaseTool>，供 AgentExecutor 注册
struct ArcToolWrapper(Arc<dyn BaseTool>);

#[async_trait::async_trait]
impl BaseTool for ArcToolWrapper {
    fn name(&self) -> &str {
        self.0.name()
    }

    fn description(&self) -> &str {
        self.0.description()
    }

    fn parameters(&self) -> serde_json::Value {
        self.0.parameters()
    }

    fn definition(&self) -> ToolDefinition {
        self.0.definition()
    }

    async fn invoke(
        &self,
        input: serde_json::Value,
    ) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
        self.0.invoke(input).await
    }
}

// ─── 主入口 ───────────────────────────────────────────────────────────────────

pub async fn run_universal_agent(
    provider: LlmProvider,
    tools: Vec<Arc<dyn BaseTool>>,
    input: String,
    cwd: String,
    system_prompt: String,
    approval_tx: mpsc::Sender<ApprovalEvent>,
    tx: mpsc::Sender<AgentEvent>,
) {
    let model = BaseModelReactLLM::new(provider.into_model()).with_system(system_prompt);

    // HITL 中间件
    let hitl = HumanInTheLoopMiddleware::from_env(TuiHitlHandler::new(approval_tx.clone()));

    // AskUser 工具
    let ask_user_invoker: Arc<dyn AskUserInvoker> = TuiAskUserHandler::new(approval_tx);
    let ask_user_tool = AskUserTool::new(ask_user_invoker);

    // 事件回调 → TUI AgentEvent channel
    let tx_event = tx.clone();
    let handler = FnEventHandler(move |event: ExecutorEvent| {
        let msg = match event {
            ExecutorEvent::TextChunk(text) => AgentEvent::AssistantChunk(text),
            ExecutorEvent::ToolStart { name, input } => AgentEvent::ToolCall {
                display: format_tool_call_display(&name, &input),
                name,
                is_error: false,
            },
            ExecutorEvent::ToolEnd { name, output: _, is_error } if is_error => {
                AgentEvent::ToolCall { name, display: String::new(), is_error: true }
            }
            ExecutorEvent::ToolEnd { .. } | ExecutorEvent::StepDone { .. } => return,
        };
        let _ = tx_event.try_send(msg);
    });

    // 构建 AgentExecutor
    let mut executor = AgentExecutor::new(model)
        .max_iterations(50)
        .add_middleware(Box::new(AgentsMdMiddleware::new()))
        .add_middleware(Box::new(SkillsMiddleware::new()))
        .add_middleware(Box::new(hitl))
        .with_event_handler(Arc::new(handler))
        .register_tool(Box::new(ask_user_tool));

    for tool in tools {
        executor = executor.register_tool(Box::new(ArcToolWrapper(tool)));
    }

    let mut state = AgentState::new(cwd);
    let agent_input = AgentInput::text(input);

    match executor.execute(agent_input, &mut state).await {
        Ok(_) => {
            // TextChunk 已通过 FnEventHandler 发送，此处只需通知完成
            let _ = tx.send(AgentEvent::Done).await;
        }
        Err(e) => {
            let _ = tx.send(AgentEvent::Error(e.to_string())).await;
            let _ = tx.send(AgentEvent::Done).await;
        }
    }
}

// ─── 辅助函数 ─────────────────────────────────────────────────────────────────

fn format_tool_call_display(tool: &str, input: &serde_json::Value) -> String {
    let name = to_pascal(tool);
    let arg = extract_display_arg(tool, input);
    match arg {
        Some(a) => format!("{}({})", name, truncate(&a, 60)),
        None => name,
    }
}

fn extract_display_arg(tool: &str, input: &serde_json::Value) -> Option<String> {
    let key = match tool {
        "bash" => "command",
        "read_file" => "file_path",
        "write_file" => "file_path",
        "edit_file" => "file_path",
        "glob_files" => "pattern",
        "search_files_rg" => {
            return input["args"].as_array().map(|a| {
                a.iter().filter_map(|x| x.as_str()).collect::<Vec<_>>().join(" ")
            });
        }
        "folder_operations" => {
            return Some(format!(
                "{} {}",
                input["operation"].as_str().unwrap_or("?"),
                input["folder_path"].as_str().unwrap_or("?")
            ));
        }
        _ => return None,
    };
    input[key].as_str().map(|s| s.to_string())
}

fn to_pascal(s: &str) -> String {
    s.split('_')
        .map(|w| {
            let mut c = w.chars();
            match c.next() {
                None => String::new(),
                Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
            }
        })
        .collect()
}

fn truncate(s: &str, max: usize) -> String {
    if s.chars().count() <= max {
        s.to_string()
    } else {
        format!("{}…", s.chars().take(max).collect::<String>())
    }
}

use std::sync::Arc;
use tokio::sync::mpsc;
use serde_json::Value;

use rust_create_agent::llm::types::{LlmRequest, StopReason};
use rust_create_agent::messages::{BaseMessage, ContentBlock};
use rust_create_agent::tools::BaseTool;
pub(crate) use super::provider::LlmProvider;
use super::AgentEvent;

// ─── 主入口 ───────────────────────────────────────────────────────────────────

pub async fn run_universal_agent(
    provider: LlmProvider,
    tools: Vec<Arc<dyn BaseTool>>,
    input: String,
    cwd: String,
    tx: mpsc::Sender<AgentEvent>,
) {
    let model = provider.into_model();

    let tool_defs: Vec<_> = tools.iter().map(|t| t.definition()).collect();
    let name_to_tool: std::collections::HashMap<String, Arc<dyn BaseTool>> =
        tools.iter().map(|t| (t.name().to_string(), t.clone())).collect();

    let system_prompt = format!(
        "你是一个 Rust Agent。当前工作目录: {cwd}\n\
         使用工具时，文件路径请用相对路径（相对于工作目录），或绝对路径。\n\
         工具参数必须是合法的 JSON，传入对应字段。"
    );

    let mut messages: Vec<BaseMessage> = vec![
        BaseMessage::human(input),
    ];

    for _iter in 0..500 {
        let request = LlmRequest::new(messages.clone())
            .with_tools(tool_defs.clone())
            .with_system(system_prompt.clone());

        let response = match model.invoke(request).await {
            Ok(r) => r,
            Err(e) => {
                let _ = tx.send(AgentEvent::Error(e.to_string())).await;
                return;
            }
        };

        if response.stop_reason == StopReason::ToolUse {
            // 提取所有 ToolUse blocks
            let blocks = response.message.content_blocks();
            let tool_use_blocks: Vec<_> = blocks
                .iter()
                .filter_map(|b| {
                    if let ContentBlock::ToolUse { id, name, input } = b {
                        Some((id.clone(), name.clone(), input.clone()))
                    } else {
                        None
                    }
                })
                .collect();

            // 将 assistant 消息加入历史
            messages.push(response.message);

            // 执行每个工具调用
            for (tool_id, tool_name, tool_input) in tool_use_blocks {
                let (observation, is_error) = match name_to_tool.get(&tool_name) {
                    Some(tool) => match tool.invoke(tool_input.clone()).await {
                        Ok(out) => (out, false),
                        Err(e) => (e.to_string(), true),
                    },
                    None => (format!("工具未找到: {tool_name}"), true),
                };

                let _ = tx.send(AgentEvent::ToolCall {
                    display: format_tool_call_display(&tool_name, &tool_input),
                    is_error,
                }).await;

                if is_error {
                    messages.push(BaseMessage::tool_error(&tool_id, observation.as_str()));
                } else {
                    messages.push(BaseMessage::tool_result(&tool_id, observation.as_str()));
                }
            }

            continue;
        }

        // 最终答案：发送文本内容
        let answer = response.message.content();
        let _ = tx.send(AgentEvent::AssistantChunk(answer.to_string())).await;
        let _ = tx.send(AgentEvent::Done).await;
        return;
    }

    let _ = tx.send(AgentEvent::AssistantChunk("已达最大迭代次数".to_string())).await;
    let _ = tx.send(AgentEvent::Done).await;
}

// ─── 辅助函数 ─────────────────────────────────────────────────────────────────

fn format_tool_call_display(tool: &str, input: &Value) -> String {
    let name = to_pascal(tool);
    let arg = extract_display_arg(tool, input);
    match arg {
        Some(a) => format!("{}({})", name, truncate(&a, 60)),
        None => name,
    }
}

fn extract_display_arg(tool: &str, input: &Value) -> Option<String> {
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

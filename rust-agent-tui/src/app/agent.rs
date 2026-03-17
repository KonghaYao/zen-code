use std::sync::Arc;
use tokio::sync::mpsc;
use serde_json::Value;

use rust_create_agent::agent::react::ToolCall;
use rust_create_agent::agent::state::{AgentState, State};
use rust_create_agent::error::AgentError;
use rust_create_agent::llm::types::{LlmRequest, StopReason};
use rust_create_agent::messages::{BaseMessage, ContentBlock};
use rust_create_agent::middleware::r#trait::Middleware;
use rust_create_agent::tools::BaseTool;
use rust_standard_middlewares::ask_user::{AskUserBatchRequest, parse_ask_user};
use rust_standard_middlewares::prelude::*;
pub(crate) use super::provider::LlmProvider;
use super::hitl::{ApprovalEvent, TuiAskUserHandler, TuiHitlHandler};
use super::AgentEvent;

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
    let model = provider.into_model();

    let mut tool_defs: Vec<_> = tools.iter().map(|t| t.definition()).collect();
    let name_to_tool: std::collections::HashMap<String, Arc<dyn BaseTool>> =
        tools.iter().map(|t| (t.name().to_string(), t.clone())).collect();

    // HITL 中间件
    let hitl = HumanInTheLoopMiddleware::from_env(TuiHitlHandler::new(approval_tx.clone()));

    // AskUser handler（批量）
    let ask_user_handler = TuiAskUserHandler::new(approval_tx);
    tool_defs.push(ask_user_tool_definition());

    let mut state = AgentState::new(cwd.clone());
    state.add_message(BaseMessage::human(input));

    let agents_md = AgentsMdMiddleware::new();
    let skills = SkillsMiddleware::new();
    let _ = agents_md.before_agent(&mut state).await;
    let _ = skills.before_agent(&mut state).await;

    let mut messages: Vec<BaseMessage> = state.messages().to_vec();

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

            messages.push(response.message);

            let tool_calls: Vec<ToolCall> = tool_use_blocks
                .iter()
                .map(|(id, name, input)| ToolCall { id: id.clone(), name: name.clone(), input: input.clone() })
                .collect();

            // ── 1. 分离 ask_user 调用 ─────────────────────────────────────────
            let mut ask_questions = Vec::new(); // (原始索引, AskUserQuestionData)
            let mut hitl_calls: Vec<ToolCall> = Vec::new();
            let mut hitl_indices: Vec<usize> = Vec::new();

            for (i, tc) in tool_calls.iter().enumerate() {
                match parse_ask_user(tc) {
                    Ok(Some(q)) => ask_questions.push((i, q)),
                    Ok(None) => {
                        hitl_calls.push(tc.clone());
                        hitl_indices.push(i);
                    }
                    Err(e) => {
                        let _ = tx.send(AgentEvent::Error(e.to_string())).await;
                        return;
                    }
                }
            }

            // ── 2. 批量 ask_user（一次弹窗，tab 切换）────────────────────────
            let mut ask_answers: std::collections::HashMap<usize, String> =
                std::collections::HashMap::new();

            if !ask_questions.is_empty() {
                let (placeholder_tx, _) = tokio::sync::oneshot::channel();
                let batch = AskUserBatchRequest {
                    questions: ask_questions.iter().map(|(_, q)| q.clone()).collect(),
                    response_tx: placeholder_tx, // ask_batch 内部会替换此 channel
                };
                let answers = ask_user_handler.ask_batch(batch).await;
                for ((orig_idx, _), answer) in ask_questions.iter().zip(answers.into_iter()) {
                    ask_answers.insert(*orig_idx, answer);
                }
            }

            // ── 3. 批量 HITL 审批 ─────────────────────────────────────────────
            let hitl_results = hitl.process_batch(&hitl_calls).await;
            let mut hitl_result_iter = hitl_results.into_iter().zip(hitl_indices.iter());

            // ── 4. 按原始顺序写回消息 ─────────────────────────────────────────
            for (i, (tool_id, tool_name, _tool_input)) in tool_use_blocks.iter().enumerate() {
                if let Some(answer) = ask_answers.remove(&i) {
                    let _ = tx.send(AgentEvent::ToolCall {
                        name: "ask_user".to_string(),
                        display: format!("? AskUser({})", truncate(&answer, 40)),
                        is_error: false,
                    }).await;
                    messages.push(BaseMessage::tool_result(tool_id, answer.as_str()));
                    continue;
                }

                if let Some((result, _)) = hitl_result_iter.next() {
                    match result {
                        Err(AgentError::ToolRejected { reason, .. }) => {
                            let _ = tx.send(AgentEvent::ToolCall {
                                name: tool_name.clone(),
                                display: format!("⊘ {} (拒绝)", to_pascal(tool_name)),
                                is_error: true,
                            }).await;
                            messages.push(BaseMessage::tool_error(
                                tool_id,
                                format!("工具调用被用户拒绝：{reason}").as_str(),
                            ));
                        }
                        Err(e) => {
                            let _ = tx.send(AgentEvent::Error(e.to_string())).await;
                            return;
                        }
                        Ok(approved_call) => {
                            let (observation, is_error) =
                                match name_to_tool.get(&approved_call.name) {
                                    Some(tool) => match tool.invoke(approved_call.input.clone()).await {
                                        Ok(out) => (out, false),
                                        Err(e) => (e.to_string(), true),
                                    },
                                    None => (format!("工具未找到: {}", approved_call.name), true),
                                };
                            let _ = tx.send(AgentEvent::ToolCall {
                                name: approved_call.name.clone(),
                                display: format_tool_call_display(&approved_call.name, &approved_call.input),
                                is_error,
                            }).await;
                            if is_error {
                                messages.push(BaseMessage::tool_error(tool_id, observation.as_str()));
                            } else {
                                messages.push(BaseMessage::tool_result(tool_id, observation.as_str()));
                            }
                        }
                    }
                }
            }

            continue;
        }

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

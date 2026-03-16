mod llm;

use langchain_rust::{
    agent::{Agent, OpenAiToolAgentBuilder},
    language_models::llm::LLM,
    memory::SimpleMemory,
    prompt_args,
    schemas::{agent::AgentEvent as LCAgentEvent, BaseMemory, Message},
};
use ratatui_textarea::TextArea;
use ratatui::style::{Color, Style};
use rust_agent_middlewares::prelude::*;
use std::{collections::HashMap, sync::Arc};
use tokio::sync::mpsc;
use futures_util::StreamExt;

#[derive(Debug, Clone, PartialEq)]
pub enum MessageRole {
    User,
    Assistant,
    Tool { name: String, is_error: bool },
    System,
}

#[derive(Debug, Clone)]
pub struct ChatMessage {
    pub role: MessageRole,
    pub content: String,
    /// 仅 Assistant 消息使用：缓存 markdown 渲染结果，避免每帧重复解析
    pub rendered_md: Option<Vec<ratatui::text::Line<'static>>>,
}

impl ChatMessage {
    pub fn user(content: impl Into<String>) -> Self {
        Self { role: MessageRole::User, content: content.into(), rendered_md: None }
    }
    pub fn assistant(content: impl Into<String>) -> Self {
        Self { role: MessageRole::Assistant, content: content.into(), rendered_md: None }
    }
    pub fn tool(name: impl Into<String>, content: impl Into<String>, is_error: bool) -> Self {
        Self { role: MessageRole::Tool { name: name.into(), is_error }, content: content.into(), rendered_md: None }
    }
    pub fn system(content: impl Into<String>) -> Self {
        Self { role: MessageRole::System, content: content.into(), rendered_md: None }
    }

    /// 追加流式 token，清除旧缓存
    pub fn push_str(&mut self, chunk: &str) {
        self.content.push_str(chunk);
        self.rendered_md = None;
    }

    /// 流式结束后调用，一次性渲染 markdown 并缓存
    pub fn finalize_markdown(&mut self) {
        if self.role == MessageRole::Assistant {
            self.rendered_md = Some(crate::ui::render_markdown(&self.content));
        }
    }
}

/// 后台 agent 实时发回的事件（每步独立）
pub enum AgentEvent {
    ToolCall { display: String, is_error: bool },
    /// 流式 token，追加到当前 assistant 消息
    AssistantChunk(String),
    /// 流式结束（或无流式时的完整答案）
    Done,
    Error(String),
}

pub struct App {
    pub messages: Vec<ChatMessage>,
    pub textarea: TextArea<'static>,
    pub loading: bool,
    pub scroll_offset: u16,
    pub cwd: String,
    pub api_key: Option<String>,
    pub api_base: Option<String>,
    agent_rx: Option<mpsc::Receiver<AgentEvent>>,
}

impl App {
    pub fn new() -> Self {
        let cwd = std::env::current_dir()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        let api_key = std::env::var("OPENAI_API_KEY").ok();
        let api_base = std::env::var("OPENAI_API_BASE")
            .or_else(|_| std::env::var("OPENAI_BASE_URL"))
            .ok();

        let has_key = api_key.is_some();

        let textarea = build_textarea(false);

        let mut app = Self {
            messages: Vec::new(),
            textarea,
            loading: false,
            scroll_offset: 0,
            cwd: cwd.clone(),
            api_key,
            api_base,
            agent_rx: None,
        };

        let status = if has_key { "OpenAI 已就绪" } else { "警告: 未设置 OPENAI_API_KEY" };
        app.messages.push(ChatMessage::system(format!(
            "Rust Agent TUI 已启动 | {} | 工作目录: {} | 工具: read_file, write_file, glob_files, search_files_rg, bash",
            status, cwd
        )));

        app
    }

    pub fn scroll_up(&mut self) { self.scroll_offset = self.scroll_offset.saturating_add(3); }
    pub fn scroll_down(&mut self) { self.scroll_offset = self.scroll_offset.saturating_sub(3); }

    pub fn set_loading(&mut self, loading: bool) {
        self.loading = loading;
        self.textarea = build_textarea(loading);
    }

    pub fn submit_message(&mut self, input: String) {
        if input.trim().is_empty() { return; }

        self.messages.push(ChatMessage::user(input.clone()));
        self.set_loading(true);
        self.scroll_offset = 0;

        let Some(key) = self.api_key.clone() else {
            self.messages.push(ChatMessage::tool(
                "config-error",
                "请设置 OPENAI_API_KEY 环境变量后重启",
                true,
            ));
            self.set_loading(false);
            return;
        };

        // 缓冲足够大，避免后台任务因 channel 满而阻塞
        let (tx, rx) = mpsc::channel(32);
        self.agent_rx = Some(rx);

        let cwd = self.cwd.clone();
        let api_base = self.api_base.clone();

        tokio::spawn(async move {
            run_agent(key, api_base, cwd, input, tx).await;
        });
    }

    /// 每帧调用：把 channel 里所有待处理事件一次性消费完，返回是否有更新
    pub fn poll_agent(&mut self) -> bool {
        let Some(rx) = self.agent_rx.as_mut() else { return false; };

        let mut updated = false;

        loop {
            match rx.try_recv() {
                Ok(AgentEvent::ToolCall { display, is_error }) => {
                    self.messages.push(ChatMessage::tool(display, "", is_error));
                    updated = true;
                }
                Ok(AgentEvent::AssistantChunk(chunk)) => {
                    match self.messages.last_mut() {
                        Some(m) if m.role == MessageRole::Assistant => {
                            m.push_str(&chunk);
                        }
                        _ => {
                            self.messages.push(ChatMessage::assistant(chunk));
                        }
                    }
                    updated = true;
                }
                Ok(AgentEvent::Done) => {
                    // 流式结束，渲染最后一条 assistant 消息的 markdown 并缓存
                    if let Some(m) = self.messages.last_mut() {
                        m.finalize_markdown();
                    }
                    self.set_loading(false);
                    self.agent_rx = None;
                    return true;
                }
                Ok(AgentEvent::Error(e)) => {
                    self.messages.push(ChatMessage::tool("agent-error", e, true));
                    self.set_loading(false);
                    self.agent_rx = None;
                    return true;
                }
                Err(mpsc::error::TryRecvError::Empty) => break,
                Err(mpsc::error::TryRecvError::Disconnected) => {
                    self.messages.push(ChatMessage::tool("agent-error", "Agent 任务意外终止", true));
                    self.set_loading(false);
                    self.agent_rx = None;
                    return true;
                }
            }
        }

        updated
    }
}

pub fn build_textarea(disabled: bool) -> TextArea<'static> {
    let mut ta = TextArea::default();
    let border_color = if disabled { Color::DarkGray } else { Color::Cyan };
    let text_color = if disabled { Color::DarkGray } else { Color::White };
    ta.set_cursor_line_style(Style::default());
    ta.set_style(Style::default().fg(text_color));
    ta.set_block(
        ratatui::widgets::Block::default()
            .borders(ratatui::widgets::Borders::ALL)
            .border_style(Style::default().fg(border_color))
            .title(ratatui::text::Span::styled(
                " 输入 ",
                Style::default().fg(Color::Cyan).add_modifier(ratatui::style::Modifier::BOLD),
            )),
    );
    ta
}

/// 后台任务：通过 tx 实时发送每一步结果
async fn run_agent(
    api_key: String,
    api_base: Option<String>,
    cwd: String,
    input: String,
    tx: mpsc::Sender<AgentEvent>,
) {
    let llm = llm::build_openai_llm(&api_key, api_base.as_deref());

    let tools: Vec<Arc<dyn langchain_rust::tools::Tool>> =
        FilesystemMiddleware::build_tools(&cwd)
            .into_iter()
            .chain(TerminalMiddleware::build_tools(&cwd))
            .map(|t| Arc::from(t) as Arc<dyn langchain_rust::tools::Tool>)
            .collect();

    let agent = match OpenAiToolAgentBuilder::new()
        .tools(&tools)
        .prefix(format!(
            "你是一个 Rust Agent。当前工作目录: {cwd}\n\
             使用工具时，文件路径请用相对路径（相对于工作目录），或绝对路径。"
        ))
        .build(llm)
    {
        Ok(a) => a,
        Err(e) => {
            let _ = tx.send(AgentEvent::Error(format!("构建 Agent 失败: {e}"))).await;
            return;
        }
    };

    let name_to_tools: HashMap<String, Arc<dyn langchain_rust::tools::Tool>> = tools
        .iter()
        .map(|t| (t.name().trim().replace(' ', "_"), t.clone()))
        .collect();

    let mut steps: Vec<(langchain_rust::schemas::agent::AgentAction, String)> = Vec::new();
    let chat_history = serde_json::json!(SimpleMemory::new().messages());

    for _ in 0..10 {
        let inputs = prompt_args! {
            "input"        => input.clone(),
            "chat_history" => chat_history.clone()
        };

        let event = match agent.plan(&steps, inputs).await {
            Ok(e) => e,
            Err(e) => {
                let _ = tx.send(AgentEvent::Error(format!("Agent plan 出错: {e}"))).await;
                return;
            }
        };

        match event {
            LCAgentEvent::Action(actions) => {
                for action in actions {
                    let (observation, is_error) = match name_to_tools.get(&action.tool) {
                        Some(tool) => match tool.call(&action.tool_input).await {
                            Ok(out) => (out, false),
                            Err(e)  => (e.to_string(), true),
                        },
                        None => (format!("工具未找到: {}", action.tool), true),
                    };

                    // 实时发送工具调用结果
                    let _ = tx.send(AgentEvent::ToolCall {
                        display: format_tool_call(&action.tool, &action.tool_input),
                        is_error,
                    }).await;

                    steps.push((action, observation));
                }
            }
            LCAgentEvent::Finish(_) => {
                // 最终答案：用 stream() 流式输出 token
                let mut messages: Vec<Message> = vec![
                    Message::new_system_message(format!(
                        "你是一个 Rust Agent。当前工作目录: {cwd}\n\
                         使用工具时，文件路径请用相对路径（相对于工作目录），或绝对路径。"
                    )),
                    Message::new_human_message(&input),
                ];
                for (action, observation) in &steps {
                    let tools: Vec<langchain_rust::schemas::FunctionCallResponse> =
                        serde_json::from_str(&action.log).ok()
                            .and_then(|log: serde_json::Value| {
                                serde_json::from_str(log["tools"].as_str()?).ok()
                            })
                            .unwrap_or_default();
                    messages.push(
                        Message::new_ai_message("").with_tool_calls(serde_json::json!(tools))
                    );
                    messages.push(Message::new_human_message(observation));
                }

                let llm = llm::build_openai_llm(&api_key, api_base.as_deref());
                match llm.stream(&messages).await {
                    Ok(mut stream) => {
                        while let Some(chunk) = stream.next().await {
                            match chunk {
                                Ok(data) if !data.content.is_empty() => {
                                    if tx.send(AgentEvent::AssistantChunk(data.content)).await.is_err() {
                                        return;
                                    }
                                }
                                Err(_) => break,
                                _ => {}
                            }
                        }
                    }
                    Err(_) => {
                        if let LCAgentEvent::Finish(f) = event {
                            let _ = tx.send(AgentEvent::AssistantChunk(f.output)).await;
                        }
                    }
                }
                let _ = tx.send(AgentEvent::Done).await;
                return;
            }
        }
    }

    let _ = tx.send(AgentEvent::AssistantChunk("已达最大迭代次数".to_string())).await;
    let _ = tx.send(AgentEvent::Done).await;
}

/// 将工具名 + JSON 参数格式化为可读的一行，如 `Bash(cargo check 2>&1)`
fn format_tool_call(tool: &str, input_json: &str) -> String {
    let arg = extract_main_arg(tool, input_json);
    let name = to_pascal(tool);
    match arg {
        Some(a) => format!("{}({})", name, truncate(&a, 60)),
        None    => name,
    }
}

/// 根据工具名从 JSON 中提取最能代表此次调用的参数值
fn extract_main_arg(tool: &str, input_json: &str) -> Option<String> {
    let v: serde_json::Value = serde_json::from_str(input_json).ok()?;
    let key = match tool {
        "bash"              => "command",
        "read_file"         => "file_path",
        "write_file"        => "file_path",
        "edit_file"         => "file_path",
        "glob_files"        => "pattern",
        "search_files_rg"   => return v["args"].as_array().map(|a| {
            a.iter().filter_map(|x| x.as_str()).collect::<Vec<_>>().join(" ")
        }),
        "folder_operations" => return Some(format!(
            "{} {}",
            v["operation"].as_str().unwrap_or("?"),
            v["folder_path"].as_str().unwrap_or("?")
        )),
        _                   => return None,
    };
    v[key].as_str().map(|s| s.to_string())
}

/// snake_case → PascalCase
fn to_pascal(s: &str) -> String {
    s.split('_')
     .map(|w| {
         let mut c = w.chars();
         match c.next() {
             None    => String::new(),
             Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
         }
     })
     .collect()
}

/// 超出长度时截断并加省略号
fn truncate(s: &str, max: usize) -> String {
    if s.chars().count() <= max {
        s.to_string()
    } else {
        format!("{}…", s.chars().take(max).collect::<String>())
    }
}

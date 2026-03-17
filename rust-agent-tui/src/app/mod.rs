pub mod agent;
mod provider;

use ratatui_textarea::TextArea;
use ratatui::style::{Color, Style};
use rust_agent_middlewares::prelude::*;
use rust_create_agent::messages::BaseMessage;
use std::sync::Arc;
use tokio::sync::mpsc;

use agent::LlmProvider;

// ─── ChatMessage ──────────────────────────────────────────────────────────────

/// TUI 显示消息 — 以 BaseMessage 为内核，附加 TUI 专属字段
#[derive(Debug, Clone)]
pub struct ChatMessage {
    /// 消息本体（角色 + 内容，复用 rust-create-agent 类型）
    pub inner: BaseMessage,
    /// Tool 消息的显示名（格式化后，用于 UI 标题）
    pub display_name: Option<String>,
    /// Tool 消息的原始工具名（用于颜色匹配）
    pub tool_name: Option<String>,
}

impl ChatMessage {
    pub fn user(content: impl Into<String>) -> Self {
        Self { inner: BaseMessage::human(content.into()), display_name: None, tool_name: None }
    }

    pub fn assistant(content: impl Into<String>) -> Self {
        Self { inner: BaseMessage::ai(content.into()), display_name: None, tool_name: None }
    }

    pub fn tool(
        raw_name: impl Into<String>,
        display: impl Into<String>,
        content: impl Into<String>,
        is_error: bool,
    ) -> Self {
        let raw_name = raw_name.into();
        let display = display.into();
        let content = content.into();
        let msg = if is_error {
            BaseMessage::tool_error(&raw_name, content.as_str())
        } else {
            BaseMessage::tool_result(&raw_name, content.as_str())
        };
        Self { inner: msg, display_name: Some(display), tool_name: Some(raw_name) }
    }

    pub fn system(content: impl Into<String>) -> Self {
        Self { inner: BaseMessage::system(content.into()), display_name: None, tool_name: None }
    }

    /// 文本内容（委托给 BaseMessage）
    pub fn content(&self) -> String {
        self.inner.content()
    }

    pub fn is_assistant(&self) -> bool {
        matches!(self.inner, BaseMessage::Ai { .. })
    }

    /// 追加流式 token
    pub fn push_str(&mut self, chunk: &str) {
        if let BaseMessage::Ai { content, .. } = &mut self.inner {
            match content {
                rust_create_agent::messages::MessageContent::Text(s) => s.push_str(chunk),
                _ => {
                    let mut s = content.text_content();
                    s.push_str(chunk);
                    *content = rust_create_agent::messages::MessageContent::Text(s);
                }
            }
        }
    }
}

// ─── AgentEvent ───────────────────────────────────────────────────────────────

/// 后台 agent 实时发回的事件（每步独立）
pub enum AgentEvent {
    ToolCall { name: String, display: String, is_error: bool },
    /// 流式 token，追加到当前 assistant 消息
    AssistantChunk(String),
    /// 流式结束（或无流式时的完整答案）
    Done,
    Error(String),
}

// ─── App ──────────────────────────────────────────────────────────────────────

pub struct App {
    pub messages: Vec<ChatMessage>,
    pub textarea: TextArea<'static>,
    pub loading: bool,
    /// 距顶部的绝对行数（0 = 顶部，max_scroll = 底部）
    pub scroll_offset: u16,
    /// 是否跟随底部：有新内容时自动滚到底
    pub scroll_follow: bool,
    pub cwd: String,
    pub provider_name: String,
    pub model_name: String,
    agent_rx: Option<mpsc::Receiver<AgentEvent>>,
}

impl App {
    pub fn new() -> Self {
        let cwd = std::env::current_dir()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        let textarea = build_textarea(false);

        let (provider_name, model_name, status_msg) = match LlmProvider::from_env() {
            Some(p) => {
                let name = p.display_name().to_string();
                let model = p.model_name().to_string();
                let msg = format!("{} ({}) 已就绪", name, model);
                (name, model, msg)
            }
            None => (
                "未配置".to_string(),
                "无".to_string(),
                "警告: 未设置任何 API Key（ANTHROPIC_API_KEY 或 OPENAI_API_KEY）".to_string(),
            ),
        };

        let mut app = Self {
            messages: Vec::new(),
            textarea,
            loading: false,
            scroll_offset: u16::MAX,
            scroll_follow: true,
            cwd: cwd.clone(),
            provider_name,
            model_name,
            agent_rx: None,
        };

        app.messages.push(ChatMessage::system(format!(
            "Rust Agent TUI 已启动 | {} | 工作目录: {} | 工具: read_file, write_file, glob_files, search_files_rg, bash",
            status_msg, cwd
        )));

        app
    }

    pub fn scroll_up(&mut self) {
        self.scroll_offset = self.scroll_offset.saturating_sub(3);
        self.scroll_follow = false;
    }

    pub fn scroll_down(&mut self) {
        self.scroll_offset = self.scroll_offset.saturating_add(3);
        self.scroll_follow = false;
    }

    pub fn set_loading(&mut self, loading: bool) {
        self.loading = loading;
        self.textarea = build_textarea(loading);
    }

    pub fn submit_message(&mut self, input: String) {
        if input.trim().is_empty() { return; }

        self.messages.push(ChatMessage::user(input.clone()));
        self.set_loading(true);
        self.scroll_offset = u16::MAX;
        self.scroll_follow = true;

        let provider = match LlmProvider::from_env() {
            Some(p) => p,
            None => {
                self.messages.push(ChatMessage::tool(
                    "error", "config-error",
                    "请设置 ANTHROPIC_API_KEY 或 OPENAI_API_KEY 环境变量后重启",
                    true,
                ));
                self.set_loading(false);
                return;
            }
        };

        let (tx, rx) = mpsc::channel(32);
        self.agent_rx = Some(rx);

        let cwd = self.cwd.clone();

        let system_prompt = crate::prompt::default_system_prompt(&cwd);

        tokio::spawn(async move {
            let tools: Vec<Arc<dyn rust_create_agent::tools::BaseTool>> =
                FilesystemMiddleware::build_tools(&cwd)
                    .into_iter()
                    .chain(TerminalMiddleware::build_tools(&cwd))
                    .map(|t| Arc::from(t) as Arc<dyn rust_create_agent::tools::BaseTool>)
                    .collect();

            agent::run_universal_agent(provider, tools, input, cwd, system_prompt, tx).await;
        });
    }

    /// 每帧调用：把 channel 里所有待处理事件一次性消费完，返回是否有更新
    pub fn poll_agent(&mut self) -> bool {
        let Some(rx) = self.agent_rx.as_mut() else { return false; };

        let mut updated = false;

        loop {
            match rx.try_recv() {
                Ok(AgentEvent::ToolCall { name, display, is_error }) => {
                    self.messages.push(ChatMessage::tool(name, display, "", is_error));
                    updated = true;
                }
                Ok(AgentEvent::AssistantChunk(chunk)) => {
                    match self.messages.last_mut() {
                        Some(m) if m.is_assistant() => {
                            m.push_str(&chunk);
                        }
                        _ => {
                            self.messages.push(ChatMessage::assistant(chunk));
                        }
                    }
                    updated = true;
                }
                Ok(AgentEvent::Done) => {
                    self.set_loading(false);
                    self.agent_rx = None;
                    return true;
                }
                Ok(AgentEvent::Error(e)) => {
                    self.messages.push(ChatMessage::tool("error", "agent-error", e, true));
                    self.set_loading(false);
                    self.agent_rx = None;
                    return true;
                }
                Err(mpsc::error::TryRecvError::Empty) => break,
                Err(mpsc::error::TryRecvError::Disconnected) => {
                    self.messages.push(ChatMessage::tool("error", "agent-error", "Agent 任务意外终止", true));
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

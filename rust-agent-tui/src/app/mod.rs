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
    /// Tool 消息的显示名（工具名称，区别于 API 层的 tool_call_id）
    pub display_name: Option<String>,
    /// Assistant 消息的 markdown 渲染缓存，避免每帧重复解析
    pub rendered_md: Option<Vec<ratatui::text::Line<'static>>>,
}

impl ChatMessage {
    pub fn user(content: impl Into<String>) -> Self {
        Self { inner: BaseMessage::human(content.into()), display_name: None, rendered_md: None }
    }

    pub fn assistant(content: impl Into<String>) -> Self {
        Self { inner: BaseMessage::ai(content.into()), display_name: None, rendered_md: None }
    }

    /// `name` 是工具显示名，`content` 是工具输出，`is_error` 标记是否失败。
    /// tool_call_id 在纯显示场景下无意义，用 `name` 作占位符。
    pub fn tool(name: impl Into<String>, content: impl Into<String>, is_error: bool) -> Self {
        let name = name.into();
        let msg = if is_error {
            BaseMessage::tool_error(&name, content.into().as_str())
        } else {
            BaseMessage::tool_result(&name, content.into().as_str())
        };
        Self { inner: msg, display_name: Some(name), rendered_md: None }
    }

    pub fn system(content: impl Into<String>) -> Self {
        Self { inner: BaseMessage::system(content.into()), display_name: None, rendered_md: None }
    }

    /// 文本内容（委托给 BaseMessage）
    pub fn content(&self) -> String {
        self.inner.content()
    }

    pub fn is_assistant(&self) -> bool {
        matches!(self.inner, BaseMessage::Ai { .. })
    }

    /// 追加流式 token，清除旧缓存
    pub fn push_str(&mut self, chunk: &str) {
        if let BaseMessage::Ai { content, .. } = &mut self.inner {
            // MessageContent::Text 直接追加；其他变体转为 Text 再追加
            match content {
                rust_create_agent::messages::MessageContent::Text(s) => s.push_str(chunk),
                _ => {
                    let mut s = content.text_content();
                    s.push_str(chunk);
                    *content = rust_create_agent::messages::MessageContent::Text(s);
                }
            }
        }
        self.rendered_md = None;
    }

    /// 流式结束后调用，一次性渲染 markdown 并缓存
    pub fn finalize_markdown(&mut self) {
        if self.is_assistant() {
            self.rendered_md = Some(crate::ui::render_markdown(&self.content()));
        }
    }
}

// ─── AgentEvent ───────────────────────────────────────────────────────────────

/// 后台 agent 实时发回的事件（每步独立）
pub enum AgentEvent {
    ToolCall { display: String, is_error: bool },
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
    pub scroll_offset: u16,
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
            scroll_offset: 0,
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

        let provider = match LlmProvider::from_env() {
            Some(p) => p,
            None => {
                self.messages.push(ChatMessage::tool(
                    "config-error",
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

        tokio::spawn(async move {
            let tools: Vec<Arc<dyn rust_create_agent::tools::BaseTool>> =
                FilesystemMiddleware::build_tools(&cwd)
                    .into_iter()
                    .chain(TerminalMiddleware::build_tools(&cwd))
                    .map(|t| Arc::from(t) as Arc<dyn rust_create_agent::tools::BaseTool>)
                    .collect();

            agent::run_universal_agent(provider, tools, input, cwd, tx).await;
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

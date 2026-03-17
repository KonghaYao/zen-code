pub mod agent;
mod provider;

use ratatui_textarea::TextArea;
use ratatui::style::{Color, Style};
use rust_agent_middlewares::prelude::*;
use std::sync::Arc;
use tokio::sync::mpsc;

use agent::LlmProvider;

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
    /// 用于 UI 显示的 provider 名称和模型
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

        // 缓冲足够大，避免后台任务因 channel 满而阻塞
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

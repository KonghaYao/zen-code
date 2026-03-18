pub mod agent;
pub mod hitl;
mod provider;

use ratatui_textarea::TextArea;
use ratatui::style::{Color, Style};
use rust_agent_middlewares::prelude::*;
use rust_create_agent::messages::BaseMessage;
use rust_agent_middlewares::ask_user::{AskUserBatchRequest, AskUserQuestionData};
use rust_agent_middlewares::prelude::{BatchItem, HitlDecision};
use std::sync::Arc;
use tokio::sync::mpsc;

use agent::LlmProvider;
pub use hitl::{ApprovalEvent, BatchApprovalRequest};

// ─── ChatMessage ──────────────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct ChatMessage {
    pub inner: BaseMessage,
    pub display_name: Option<String>,
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

    pub fn content(&self) -> String {
        self.inner.content()
    }

    pub fn is_assistant(&self) -> bool {
        matches!(self.inner, BaseMessage::Ai { .. })
    }

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

pub enum AgentEvent {
    ToolCall { name: String, display: String, is_error: bool },
    AssistantChunk(String),
    Done,
    Error(String),
    /// HITL 批量审批请求
    ApprovalNeeded(BatchApprovalRequest),
    /// AskUser 批量提问请求
    AskUserBatch(AskUserBatchRequest),
}

// ─── HitlBatchPrompt ──────────────────────────────────────────────────────────

/// 批量 HITL 弹窗状态：每项独立的批准/拒绝选择
pub struct HitlBatchPrompt {
    /// 待审批的工具调用列表
    pub items: Vec<BatchItem>,
    /// 每项的当前决策（true=批准，false=拒绝）
    pub approved: Vec<bool>,
    /// 当前光标所在的行（工具索引）
    pub cursor: usize,
    /// 回复 channel
    pub response_tx: tokio::sync::oneshot::Sender<Vec<HitlDecision>>,
}

impl HitlBatchPrompt {
    pub fn new(items: Vec<BatchItem>, response_tx: tokio::sync::oneshot::Sender<Vec<HitlDecision>>) -> Self {
        let len = items.len();
        Self {
            items,
            approved: vec![true; len], // 默认全部批准
            cursor: 0,
            response_tx,
        }
    }

    pub fn move_cursor(&mut self, delta: isize) {
        let len = self.items.len();
        if len == 0 { return; }
        self.cursor = ((self.cursor as isize + delta).rem_euclid(len as isize)) as usize;
    }

    /// 切换当前项的批准/拒绝状态
    pub fn toggle_current(&mut self) {
        if let Some(v) = self.approved.get_mut(self.cursor) {
            *v = !*v;
        }
    }

    /// 全部批准
    pub fn approve_all(&mut self) {
        self.approved.iter_mut().for_each(|v| *v = true);
    }

    /// 全部拒绝
    pub fn reject_all(&mut self) {
        self.approved.iter_mut().for_each(|v| *v = false);
    }

    /// 确认并发送决策
    pub fn confirm(self) {
        let decisions: Vec<HitlDecision> = self.approved
            .iter()
            .map(|&ok| if ok { HitlDecision::Approve } else { HitlDecision::Reject })
            .collect();
        let _ = self.response_tx.send(decisions);
    }
}

// ─── AskUserBatchPrompt ───────────────────────────────────────────────────────

/// 单个问题的交互状态
pub struct QuestionState {
    pub data: AskUserQuestionData,
    pub option_cursor: isize,   // 当前光标在第几个选项（最后一项 = 自定义输入行）
    pub selected: Vec<bool>,
    pub custom_input: String,
    pub in_custom_input: bool,
}

impl QuestionState {
    fn new(data: AskUserQuestionData) -> Self {
        let len = data.options.len();
        Self {
            data,
            option_cursor: 0,
            selected: vec![false; len],
            custom_input: String::new(),
            in_custom_input: false,
        }
    }

    fn total_rows(&self) -> isize {
        self.data.options.len() as isize + if self.data.allow_custom_input { 1 } else { 0 }
    }

    pub fn move_option_cursor(&mut self, delta: isize) {
        let total = self.total_rows();
        if total == 0 { return; }
        self.option_cursor = (self.option_cursor + delta).rem_euclid(total);
        self.in_custom_input =
            self.data.allow_custom_input && self.option_cursor == self.data.options.len() as isize;
    }

    pub fn toggle_current(&mut self) {
        if self.in_custom_input { return; }
        let i = self.option_cursor as usize;
        if i < self.selected.len() {
            if self.data.multi_select {
                self.selected[i] = !self.selected[i];
            } else {
                self.selected.iter_mut().for_each(|v| *v = false);
                self.selected[i] = true;
            }
        }
    }

    pub fn push_char(&mut self, c: char) {
        if self.in_custom_input { self.custom_input.push(c); }
    }

    pub fn pop_char(&mut self) {
        if self.in_custom_input { self.custom_input.pop(); }
    }

    /// 收集当前问题的答案文本
    pub fn answer(&self) -> String {
        let mut parts: Vec<String> = self.selected.iter().enumerate()
            .filter(|(_, &v)| v)
            .map(|(i, _)| self.data.options[i].label.clone())
            .collect();
        let custom = self.custom_input.trim().to_string();
        if !custom.is_empty() { parts.push(custom); }
        if parts.is_empty() { self.custom_input.trim().to_string() } else { parts.join(", ") }
    }
}

/// 批量 AskUser 弹窗：多个问题用 Tab 切换，Enter 逐题确认，全部确认后提交
pub struct AskUserBatchPrompt {
    pub questions: Vec<QuestionState>,
    /// 当前激活的问题 tab 索引
    pub active_tab: usize,
    /// 每个问题是否已按 Enter 确认
    pub confirmed: Vec<bool>,
    pub response_tx: tokio::sync::oneshot::Sender<Vec<String>>,
}

impl AskUserBatchPrompt {
    pub fn from_request(req: AskUserBatchRequest) -> Self {
        let len = req.questions.len();
        let questions = req.questions.into_iter().map(QuestionState::new).collect();
        Self {
            questions,
            active_tab: 0,
            confirmed: vec![false; len],
            response_tx: req.response_tx,
        }
    }

    pub fn next_tab(&mut self) {
        if !self.questions.is_empty() {
            self.active_tab = (self.active_tab + 1) % self.questions.len();
        }
    }

    pub fn prev_tab(&mut self) {
        if !self.questions.is_empty() {
            self.active_tab = self.active_tab.checked_sub(1).unwrap_or(self.questions.len() - 1);
        }
    }

    pub fn current(&mut self) -> &mut QuestionState {
        &mut self.questions[self.active_tab]
    }

    /// Enter 确认当前问题：标记已确认，跳到下一未确认的问题。
    /// 若所有问题都已确认，返回 true（调用方负责调用 confirm()）。
    pub fn confirm_current(&mut self) -> bool {
        self.confirmed[self.active_tab] = true;

        if self.confirmed.iter().all(|&c| c) {
            return true;
        }

        // 跳到下一个未确认的问题
        let n = self.questions.len();
        for offset in 1..=n {
            let next = (self.active_tab + offset) % n;
            if !self.confirmed[next] {
                self.active_tab = next;
                break;
            }
        }
        false
    }

    pub fn confirm(self) {
        let answers: Vec<String> = self.questions.iter().map(|q| q.answer()).collect();
        let _ = self.response_tx.send(answers);
    }
}

// ─── App ──────────────────────────────────────────────────────────────────────

pub struct App {
    pub messages: Vec<ChatMessage>,
    pub textarea: TextArea<'static>,
    pub loading: bool,
    pub scroll_offset: u16,
    pub scroll_follow: bool,
    pub cwd: String,
    pub provider_name: String,
    pub model_name: String,
    agent_rx: Option<mpsc::Receiver<AgentEvent>>,
    /// 当前等待用户确认的批量 HITL 弹窗
    pub hitl_prompt: Option<HitlBatchPrompt>,
    /// 当前等待用户输入的 AskUser 批量弹窗
    pub ask_user_prompt: Option<AskUserBatchPrompt>,
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
            hitl_prompt: None,
            ask_user_prompt: None,
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

        // YOLO_MODE 时跳过 HITL channel，直接给 agent 一个永远不会被消费的 sender
        let yolo = rust_agent_middlewares::is_yolo_mode();

        let (approval_tx, approval_rx) = mpsc::channel::<ApprovalEvent>(4);
        if !yolo {
            let tx_hitl = tx.clone();
            tokio::spawn(async move {
                let mut approval_rx = approval_rx;
                while let Some(ev) = approval_rx.recv().await {
                    match ev {
                        ApprovalEvent::Batch(req) => {
                            let _ = tx_hitl.send(AgentEvent::ApprovalNeeded(req)).await;
                        }
                        ApprovalEvent::AskUserBatch(req) => {
                            let _ = tx_hitl.send(AgentEvent::AskUserBatch(req)).await;
                        }
                    }
                }
            });
        }
        // YOLO 时 approval_rx 直接丢弃，approval_tx 随 agent task 结束一起销毁

        let cwd = self.cwd.clone();
        let system_prompt = crate::prompt::default_system_prompt(&cwd);

        tokio::spawn(async move {
            let tools: Vec<Arc<dyn rust_create_agent::tools::BaseTool>> =
                FilesystemMiddleware::build_tools(&cwd)
                    .into_iter()
                    .chain(TerminalMiddleware::build_tools(&cwd))
                    .map(|t| Arc::from(t) as Arc<dyn rust_create_agent::tools::BaseTool>)
                    .collect();

            agent::run_universal_agent(provider, tools, input, cwd, system_prompt, approval_tx, tx).await;
        });
    }

    /// 每帧调用：消费 channel 事件，返回是否有 UI 更新
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
                        Some(m) if m.is_assistant() => m.push_str(&chunk),
                        _ => self.messages.push(ChatMessage::assistant(chunk)),
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
                Ok(AgentEvent::ApprovalNeeded(req)) => {
                    self.hitl_prompt = Some(HitlBatchPrompt::new(req.items, req.response_tx));
                    updated = true;
                    break; // 暂停消费，等待用户确认
                }
                Ok(AgentEvent::AskUserBatch(req)) => {
                    self.ask_user_prompt = Some(AskUserBatchPrompt::from_request(req));
                    updated = true;
                    break; // 暂停消费，等待用户输入
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

    // ─── HITL 操作 ────────────────────────────────────────────────────────────

    /// 上下移动列表光标
    pub fn hitl_move(&mut self, delta: isize) {
        if let Some(p) = self.hitl_prompt.as_mut() {
            p.move_cursor(delta);
        }
    }

    /// 切换当前项批准/拒绝
    pub fn hitl_toggle(&mut self) {
        if let Some(p) = self.hitl_prompt.as_mut() {
            p.toggle_current();
        }
    }

    /// 全部批准并提交
    pub fn hitl_approve_all(&mut self) {
        if let Some(mut p) = self.hitl_prompt.take() {
            p.approve_all();
            p.confirm();
        }
    }

    /// 全部拒绝并提交
    pub fn hitl_reject_all(&mut self) {
        if let Some(mut p) = self.hitl_prompt.take() {
            p.reject_all();
            p.confirm();
        }
    }

    /// 按当前每项选择确认并提交
    pub fn hitl_confirm(&mut self) {
        if let Some(p) = self.hitl_prompt.take() {
            p.confirm();
        }
    }

    // ─── AskUser 操作 ─────────────────────────────────────────────────────────

    pub fn ask_user_next_tab(&mut self) {
        if let Some(p) = self.ask_user_prompt.as_mut() { p.next_tab(); }
    }

    pub fn ask_user_prev_tab(&mut self) {
        if let Some(p) = self.ask_user_prompt.as_mut() { p.prev_tab(); }
    }

    pub fn ask_user_move(&mut self, delta: isize) {
        if let Some(p) = self.ask_user_prompt.as_mut() {
            p.current().move_option_cursor(delta);
        }
    }

    pub fn ask_user_toggle(&mut self) {
        if let Some(p) = self.ask_user_prompt.as_mut() {
            p.current().toggle_current();
        }
    }

    pub fn ask_user_push_char(&mut self, c: char) {
        if let Some(p) = self.ask_user_prompt.as_mut() {
            p.current().push_char(c);
        }
    }

    pub fn ask_user_pop_char(&mut self) {
        if let Some(p) = self.ask_user_prompt.as_mut() {
            p.current().pop_char();
        }
    }

    /// Enter：确认当前问题。若全部问题均已确认则提交并关闭弹窗。
    /// 若当前问题没有选中任何选项（且不在自定义输入模式），自动选中光标所在选项。
    pub fn ask_user_confirm(&mut self) {
        if let Some(p) = self.ask_user_prompt.as_mut() {
            let q = &mut p.questions[p.active_tab];
            // 没有选中任何选项且不在自定义输入模式：自动选中当前光标行
            if !q.in_custom_input && !q.selected.iter().any(|&v| v) && q.custom_input.trim().is_empty() {
                q.toggle_current();
            }
        }

        let all_done = if let Some(p) = self.ask_user_prompt.as_mut() {
            p.confirm_current()
        } else {
            return;
        };
        if all_done {
            if let Some(p) = self.ask_user_prompt.take() {
                p.confirm();
            }
        }
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

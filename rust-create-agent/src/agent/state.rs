use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// 重新导出 langchain-rust 消息类型
pub use langchain_rust::schemas::{Message as LCMessage, MessageType};

/// State trait - 所有 Agent 状态必须实现此 trait
/// 与 TypeScript BaseAgentStateType 对齐
pub trait State: Send + Sync + Clone + 'static {
    /// 获取当前工作目录
    fn cwd(&self) -> &str;

    /// 设置当前工作目录
    fn set_cwd(&mut self, cwd: impl Into<String>);

    /// 获取消息历史（langchain-rust 标准格式）
    fn messages(&self) -> &[LCMessage];

    /// 添加消息
    fn add_message(&mut self, message: LCMessage);

    /// 获取当前步骤
    fn current_step(&self) -> usize;

    /// 设置当前步骤
    fn set_current_step(&mut self, step: usize);
}

/// 基础 Agent 状态（与 TypeScript BaseAgentStateType 对齐）
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct AgentState {
    /// 当前工作目录（必须字段，与 TypeScript 对齐）
    pub cwd: String,

    /// 消息历史（langchain-rust Message 格式）
    #[serde(skip)]
    pub messages: Vec<LCMessage>,

    /// 当前步骤数
    pub current_step: usize,

    /// 附加上下文数据（键值对）
    pub context: HashMap<String, String>,
}

impl AgentState {
    pub fn new(cwd: impl Into<String>) -> Self {
        Self {
            cwd: cwd.into(),
            ..Default::default()
        }
    }

    pub fn with_context(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.context.insert(key.into(), value.into());
        self
    }

    pub fn get_context(&self, key: &str) -> Option<&str> {
        self.context.get(key).map(|s| s.as_str())
    }

    pub fn set_context(&mut self, key: impl Into<String>, value: impl Into<String>) {
        self.context.insert(key.into(), value.into());
    }
}

impl State for AgentState {
    fn cwd(&self) -> &str {
        &self.cwd
    }

    fn set_cwd(&mut self, cwd: impl Into<String>) {
        self.cwd = cwd.into();
    }

    fn messages(&self) -> &[LCMessage] {
        &self.messages
    }

    fn add_message(&mut self, message: LCMessage) {
        self.messages.push(message);
    }

    fn current_step(&self) -> usize {
        self.current_step
    }

    fn set_current_step(&mut self, step: usize) {
        self.current_step = step;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use langchain_rust::schemas::Message;

    #[test]
    fn test_agent_state_new() {
        let state = AgentState::new("/workspace");
        assert_eq!(state.cwd(), "/workspace");
        assert_eq!(state.messages().len(), 0);
        assert_eq!(state.current_step(), 0);
    }

    #[test]
    fn test_agent_state_messages() {
        let mut state = AgentState::new("/workspace");
        state.add_message(Message::new_human_message("hello"));
        state.add_message(Message::new_ai_message("hi there"));
        assert_eq!(state.messages().len(), 2);
        assert_eq!(state.messages()[0].message_type, MessageType::HumanMessage);
    }

    #[test]
    fn test_agent_state_context() {
        let state = AgentState::new("/workspace")
            .with_context("key1", "value1")
            .with_context("key2", "value2");
        assert_eq!(state.get_context("key1"), Some("value1"));
        assert_eq!(state.get_context("missing"), None);
    }
}

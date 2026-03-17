use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::messages::BaseMessage;

/// State trait - 所有 Agent 状态必须实现此 trait
/// 与 TypeScript BaseAgentStateType 对齐
pub trait State: Send + Sync + Clone + 'static {
    fn cwd(&self) -> &str;
    fn set_cwd(&mut self, cwd: impl Into<String>);
    fn messages(&self) -> &[BaseMessage];
    fn add_message(&mut self, message: BaseMessage);

    /// 将消息前插到消息历史开头（系统消息置于最前）
    ///
    /// 默认为空实现（no-op），具体状态类型应覆盖此方法以提供正确行为。
    /// `AgentState` 已提供高效实现（Vec::insert(0, ...)）。
    fn prepend_message(&mut self, message: BaseMessage) {
        let _ = message;
    }

    fn current_step(&self) -> usize;
    fn set_current_step(&mut self, step: usize);
}

/// 基础 Agent 状态（与 TypeScript BaseAgentStateType 对齐）
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct AgentState {
    pub cwd: String,
    #[serde(skip)]
    pub messages: Vec<BaseMessage>,
    pub current_step: usize,
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

    fn messages(&self) -> &[BaseMessage] {
        &self.messages
    }

    fn add_message(&mut self, message: BaseMessage) {
        self.messages.push(message);
    }

    fn prepend_message(&mut self, message: BaseMessage) {
        self.messages.insert(0, message);
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
        state.add_message(BaseMessage::human("hello"));
        state.add_message(BaseMessage::ai("hi there"));
        assert_eq!(state.messages().len(), 2);
        assert!(matches!(state.messages()[0], BaseMessage::Human { .. }));
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

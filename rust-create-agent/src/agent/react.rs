use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// 重新导出 langchain-rust 的核心类型，统一工具/LLM 接口
pub use langchain_rust::language_models::llm::LLM;
pub use langchain_rust::schemas::{FunctionCallResponse, FunctionDefinition, Message as LCMessage, MessageType};
pub use langchain_rust::tools::Tool;

/// Agent 输入
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentInput {
    /// 用户输入文本
    pub text: String,
    /// 附加参数
    pub params: HashMap<String, serde_json::Value>,
}

impl AgentInput {
    pub fn text(text: impl Into<String>) -> Self {
        Self {
            text: text.into(),
            params: HashMap::new(),
        }
    }

    pub fn with_param(
        mut self,
        key: impl Into<String>,
        value: impl Into<serde_json::Value>,
    ) -> Self {
        self.params.insert(key.into(), value.into());
        self
    }
}

/// Agent 输出
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentOutput {
    /// 最终回答文本
    pub text: String,
    /// 执行步骤数
    pub steps: usize,
    /// 所有工具调用记录
    pub tool_calls: Vec<(ToolCall, ToolResult)>,
}

impl AgentOutput {
    pub fn new(text: impl Into<String>, steps: usize) -> Self {
        Self {
            text: text.into(),
            steps,
            tool_calls: Vec::new(),
        }
    }
}

/// 工具调用请求（对应 langchain-rust FunctionCallResponse）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    /// 调用 ID（唯一标识）
    pub id: String,
    /// 工具名称
    pub name: String,
    /// 工具输入参数（JSON）
    pub input: serde_json::Value,
}

impl ToolCall {
    pub fn new(
        id: impl Into<String>,
        name: impl Into<String>,
        input: serde_json::Value,
    ) -> Self {
        Self {
            id: id.into(),
            name: name.into(),
            input,
        }
    }
}

impl From<&FunctionCallResponse> for ToolCall {
    fn from(r: &FunctionCallResponse) -> Self {
        let input = serde_json::from_str(&r.function.arguments)
            .unwrap_or(serde_json::Value::String(r.function.arguments.clone()));
        ToolCall {
            id: r.id.clone(),
            name: r.function.name.clone(),
            input,
        }
    }
}

/// 工具调用结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolResult {
    /// 对应的工具调用 ID
    pub tool_call_id: String,
    /// 工具名称
    pub tool_name: String,
    /// 输出内容
    pub output: String,
    /// 是否出错
    pub is_error: bool,
}

impl ToolResult {
    pub fn success(
        tool_call_id: impl Into<String>,
        tool_name: impl Into<String>,
        output: impl Into<String>,
    ) -> Self {
        Self {
            tool_call_id: tool_call_id.into(),
            tool_name: tool_name.into(),
            output: output.into(),
            is_error: false,
        }
    }

    pub fn error(
        tool_call_id: impl Into<String>,
        tool_name: impl Into<String>,
        message: impl Into<String>,
    ) -> Self {
        Self {
            tool_call_id: tool_call_id.into(),
            tool_name: tool_name.into(),
            output: message.into(),
            is_error: true,
        }
    }
}

/// LLM 推理结果（ReAct 单步）
#[derive(Debug, Clone)]
pub struct Reasoning {
    /// 推理文本（CoT）
    pub thought: String,
    /// 工具调用列表（空表示生成最终答案）
    pub tool_calls: Vec<ToolCall>,
    /// 最终答案（仅当 tool_calls 为空时有效）
    pub final_answer: Option<String>,
}

impl Reasoning {
    pub fn with_tools(thought: impl Into<String>, tool_calls: Vec<ToolCall>) -> Self {
        Self {
            thought: thought.into(),
            tool_calls,
            final_answer: None,
        }
    }

    pub fn with_answer(thought: impl Into<String>, answer: impl Into<String>) -> Self {
        Self {
            thought: thought.into(),
            tool_calls: Vec::new(),
            final_answer: Some(answer.into()),
        }
    }

    /// 是否需要工具调用
    pub fn needs_tool_call(&self) -> bool {
        !self.tool_calls.is_empty()
    }
}

/// ReAct LLM trait - 在 langchain-rust LLM 基础上增加 ReAct 推理能力
///
/// 实现者可以：
/// 1. 包装 langchain-rust 的任意 LLM 实现（OpenAI、Claude 等）
/// 2. 解析 LLM 输出中的工具调用（function calling 或文本解析）
#[async_trait::async_trait]
pub trait ReactLLM: Send + Sync {
    /// 生成推理（ReAct 单步）
    /// messages: langchain-rust 标准消息格式
    /// tools: 可用工具（langchain-rust Tool trait）
    async fn generate_reasoning(
        &self,
        messages: &[LCMessage],
        tools: &[&dyn Tool],
    ) -> crate::error::AgentResult<Reasoning>;
}

/// 工具注册表 - 包装 langchain-rust Tool trait
pub struct ToolRegistry {
    tools: HashMap<String, Box<dyn Tool>>,
}

impl ToolRegistry {
    pub fn new() -> Self {
        Self {
            tools: HashMap::new(),
        }
    }

    pub fn register(&mut self, tool: Box<dyn Tool>) {
        self.tools.insert(tool.name(), tool);
    }

    pub fn get(&self, name: &str) -> Option<&dyn Tool> {
        self.tools.get(name).map(|t| t.as_ref())
    }

    pub fn all(&self) -> Vec<&dyn Tool> {
        self.tools.values().map(|t| t.as_ref()).collect()
    }

    pub fn tool_names(&self) -> Vec<&str> {
        self.tools.keys().map(|s| s.as_str()).collect()
    }
}

impl Default for ToolRegistry {
    fn default() -> Self {
        Self::new()
    }
}

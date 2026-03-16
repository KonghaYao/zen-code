use async_trait::async_trait;
use std::sync::{Arc, Mutex};

use langchain_rust::schemas::Message as LCMessage;
use langchain_rust::tools::Tool;

use crate::agent::react::{ReactLLM, Reasoning, ToolCall};
use crate::error::AgentResult;

/// Mock ReactLLM - 用于测试，按预设脚本返回推理结果
///
/// 实现 ReactLLM trait，内部不调用真实 LLM，
/// 按照预先设定的脚本序列依次返回 Reasoning。
pub struct MockLLM {
    script: Arc<Mutex<Vec<Reasoning>>>,
    index: Arc<Mutex<usize>>,
}

impl MockLLM {
    pub fn new(script: Vec<Reasoning>) -> Self {
        Self {
            script: Arc::new(Mutex::new(script)),
            index: Arc::new(Mutex::new(0)),
        }
    }

    /// 创建始终返回固定答案的 Mock
    pub fn always_answer(answer: impl Into<String>) -> Self {
        let answer = answer.into();
        Self::new(vec![Reasoning::with_answer("Thinking...", answer)])
    }

    /// 创建先调用工具再返回答案的 Mock
    pub fn tool_then_answer(
        tool_name: impl Into<String>,
        tool_input: serde_json::Value,
        answer: impl Into<String>,
    ) -> Self {
        let call = ToolCall::new("call_1", tool_name, tool_input);
        Self::new(vec![
            Reasoning::with_tools("I need to use a tool", vec![call]),
            Reasoning::with_answer("Based on the tool result", answer),
        ])
    }
}

#[async_trait]
impl ReactLLM for MockLLM {
    async fn generate_reasoning(
        &self,
        _messages: &[LCMessage],
        _tools: &[&dyn Tool],
    ) -> AgentResult<Reasoning> {
        let script = self.script.lock().unwrap();
        let mut index = self.index.lock().unwrap();

        let reasoning = if *index < script.len() {
            script[*index].clone()
        } else {
            script.last().cloned().unwrap_or_else(|| {
                Reasoning::with_answer("(no more script)", "Done")
            })
        };

        *index += 1;
        Ok(reasoning)
    }
}

/// OpenAI/Claude 等真实 LLM 的包装器（框架层示意）
///
/// 使用方式：
/// ```rust,ignore
/// use langchain_rust::llm::openai::OpenAI;
/// use rust_create_agent::llm::LangChainLLM;
///
/// let openai = OpenAI::default();
/// let llm = LangChainLLM::new(openai);
/// let agent = AgentExecutor::new(llm)...;
/// ```
///
/// 具体实现需要：
/// 1. 调用 langchain_rust::language_models::llm::LLM::generate()
/// 2. 解析返回的 GenerateResult 中的 function_calls
/// 3. 将其转换为 Reasoning
pub struct LangChainLLM<L: langchain_rust::language_models::llm::LLM> {
    pub inner: L,
}

impl<L: langchain_rust::language_models::llm::LLM> LangChainLLM<L> {
    pub fn new(llm: L) -> Self {
        Self { inner: llm }
    }
}

#[async_trait]
impl<L: langchain_rust::language_models::llm::LLM> ReactLLM for LangChainLLM<L> {
    async fn generate_reasoning(
        &self,
        messages: &[LCMessage],
        _tools: &[&dyn Tool],
    ) -> AgentResult<Reasoning> {
        // 调用 langchain-rust LLM
        let result = self
            .inner
            .generate(messages)
            .await
            .map_err(|e| crate::error::AgentError::LlmError(e.to_string()))?;

        // langchain-rust GenerateResult.generation 是纯文本。
        // Function calling 结果由上层通过解析文本或 FunctionCallResponse 获取。
        // 这里简单处理：若文本包含 JSON tool call 格式，则解析；否则作为最终答案。
        let text = result.generation.trim();

        // 尝试解析为 FunctionCallResponse（OpenAI function calling 格式）
        if let Ok(call) = serde_json::from_str::<langchain_rust::schemas::FunctionCallResponse>(text) {
            let tool_call = ToolCall::from(&call);
            return Ok(Reasoning::with_tools("Using tool", vec![tool_call]));
        }

        // 无工具调用 → 最终答案
        Ok(Reasoning::with_answer("", text))
    }
}

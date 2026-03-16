use async_trait::async_trait;
use rust_create_agent::prelude::*;
use std::error::Error;

// ── 辅助工具（实现 langchain-rust Tool trait） ─────────────────────────────────

struct EchoTool;

#[async_trait]
impl Tool for EchoTool {
    fn name(&self) -> String { "echo".to_string() }
    fn description(&self) -> String { "Echoes the input back".to_string() }
    fn parameters(&self) -> serde_json::Value {
        serde_json::json!({ "type": "object", "properties": { "text": { "type": "string" } } })
    }
    async fn run(&self, input: serde_json::Value) -> Result<String, Box<dyn Error>> {
        Ok(format!("echo: {}", input["text"].as_str().unwrap_or("")))
    }
}

struct FailingTool;

#[async_trait]
impl Tool for FailingTool {
    fn name(&self) -> String { "fail".to_string() }
    fn description(&self) -> String { "Always fails".to_string() }
    fn parameters(&self) -> serde_json::Value { serde_json::json!({}) }
    async fn run(&self, _input: serde_json::Value) -> Result<String, Box<dyn Error>> {
        Err("intentional failure".into())
    }
}

// ── 测试 ──────────────────────────────────────────────────────────────────────

#[tokio::test]
async fn test_agent_simple_answer() {
    let agent = AgentExecutor::new(MockLLM::always_answer("simple answer"));
    let mut state = AgentState::new("/test");

    let output = agent.execute(AgentInput::text("hello"), &mut state).await.unwrap();

    assert_eq!(output.text, "simple answer");
    assert_eq!(output.steps, 1);
    assert!(output.tool_calls.is_empty());
}

#[tokio::test]
async fn test_agent_tool_call_then_answer() {
    let llm = MockLLM::tool_then_answer(
        "echo",
        serde_json::json!({ "text": "hello world" }),
        "The echo said: hello world",
    );

    let agent = AgentExecutor::new(llm).register_tool(Box::new(EchoTool));
    let mut state = AgentState::new("/test");

    let output = agent.execute(AgentInput::text("echo something"), &mut state).await.unwrap();

    assert_eq!(output.text, "The echo said: hello world");
    assert_eq!(output.tool_calls.len(), 1);
    assert_eq!(output.tool_calls[0].0.name, "echo");
    assert_eq!(output.tool_calls[0].1.output, "echo: hello world");
}

#[tokio::test]
async fn test_agent_tool_not_found() {
    let llm = MockLLM::tool_then_answer("nonexistent_tool", serde_json::json!({}), "done");
    let agent = AgentExecutor::new(llm);
    let mut state = AgentState::new("/test");

    let result = agent.execute(AgentInput::text("use missing tool"), &mut state).await;

    assert!(result.is_err());
    match result.unwrap_err() {
        AgentError::ToolNotFound(name) => assert_eq!(name, "nonexistent_tool"),
        e => panic!("Unexpected error: {e}"),
    }
}

#[tokio::test]
async fn test_agent_failing_tool_is_recorded() {
    let llm = MockLLM::tool_then_answer("fail", serde_json::json!({}), "got error but continuing");
    let agent = AgentExecutor::new(llm).register_tool(Box::new(FailingTool));
    let mut state = AgentState::new("/test");

    let output = agent.execute(AgentInput::text("try failing tool"), &mut state).await.unwrap();

    assert_eq!(output.tool_calls.len(), 1);
    assert!(output.tool_calls[0].1.is_error);
}

#[tokio::test]
async fn test_agent_max_iterations() {
    let calls: Vec<Reasoning> = (0..20)
        .map(|_| Reasoning::with_tools(
            "still thinking",
            vec![ToolCall::new("c", "echo", serde_json::json!({"text":"hi"}))],
        ))
        .collect();

    let agent = AgentExecutor::new(MockLLM::new(calls))
        .max_iterations(3)
        .register_tool(Box::new(EchoTool));
    let mut state = AgentState::new("/test");

    let result = agent.execute(AgentInput::text("loop forever"), &mut state).await;
    assert!(matches!(result, Err(AgentError::MaxIterationsExceeded(3))));
}

#[tokio::test]
async fn test_state_messages_grow() {
    let agent = AgentExecutor::new(MockLLM::always_answer("ok"));
    let mut state = AgentState::new("/test");

    assert_eq!(state.messages().len(), 0);
    agent.execute(AgentInput::text("hello"), &mut state).await.unwrap();

    // user message + assistant answer
    assert_eq!(state.messages().len(), 2);
}

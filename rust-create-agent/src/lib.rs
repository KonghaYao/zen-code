//! # rust-create-agent
//!
//! Rust Agent framework with middleware system.
//! Aligned with `@langgraph-js/standard-agent` (TypeScript).

pub mod agent;
pub mod error;
pub mod llm;
pub mod messages;
pub mod middleware;
pub mod tools;

/// Prelude - 常用类型一次性导入
pub mod prelude {
    pub use crate::agent::{
        executor::AgentExecutorBuilder,
        react::{
            AgentInput, AgentOutput, ReactLLM, Reasoning, ToolCall, ToolRegistry, ToolResult,
        },
        state::{AgentState, State},
        AgentExecutor,
    };
    pub use crate::error::{AgentError, AgentResult};
    pub use crate::llm::{BaseModel, BaseModelReactLLM, ChatAnthropic, ChatOpenAI, MockLLM};
    pub use crate::messages::{
        BaseMessage, ContentBlock, DocumentSource, ImageSource, MessageContent, ToolCallRequest,
    };
    pub use crate::middleware::{
        r#trait::Middleware,
        LoggingMiddleware, MetricsMiddleware, MiddlewareChain, NoopMiddleware,
    };
    pub use crate::tools::{BaseTool, ToolDefinition};
}

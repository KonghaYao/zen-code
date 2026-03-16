//! # rust-create-agent
//!
//! Rust Agent framework with middleware system, built on top of `langchain-rust`.
//! Aligned with `@langgraph-js/standard-agent` (TypeScript).
//!
//! ## Architecture
//!
//! ```text
//! ┌─────────────────────────────────────┐
//! │     Application Layer               │  (具体应用)
//! ├─────────────────────────────────────┤
//! │     rust-create-agent (本库)         │
//! │  ┌──────────────────────────────┐  │
//! │  │   AgentExecutor (ReAct Loop) │  │
//! │  ├──────────────────────────────┤  │
//! │  │   MiddlewareChain            │  │
//! │  ├──────────────────────────────┤  │
//! │  │   langchain-rust Tool/LLM    │  │  ← 直接使用 langchain-rust
//! │  └──────────────────────────────┘  │
//! ├─────────────────────────────────────┤
//! │     langchain-rust                  │  (基础库)
//! └─────────────────────────────────────┘
//! ```
//!
//! ## Quick Start
//!
//! ```rust,no_run
//! use rust_create_agent::prelude::*;
//!
//! #[tokio::main]
//! async fn main() -> anyhow::Result<()> {
//!     let llm = MockLLM::always_answer("Hello!");
//!     let agent = AgentExecutor::new(llm)
//!         .max_iterations(10)
//!         .add_middleware(Box::new(LoggingMiddleware::new()));
//!
//!     let mut state = AgentState::new("/workspace");
//!     let output = agent.execute(AgentInput::text("Say hello"), &mut state).await?;
//!     println!("{}", output.text);
//!     Ok(())
//! }
//! ```

pub mod agent;
pub mod error;
pub mod llm;
pub mod middleware;

/// Prelude - 常用类型一次性导入
pub mod prelude {
    // langchain-rust 核心类型（直接重导出）
    pub use langchain_rust::schemas::{Message as LCMessage, MessageType};
    pub use langchain_rust::tools::Tool;

    pub use crate::agent::{
        executor::AgentExecutorBuilder,
        react::{
            AgentInput, AgentOutput, ReactLLM, Reasoning, ToolCall, ToolRegistry, ToolResult,
        },
        state::{AgentState, State},
        AgentExecutor,
    };
    pub use crate::error::{AgentError, AgentResult};
    pub use crate::llm::{LangChainLLM, MockLLM};
    pub use crate::middleware::{
        r#trait::Middleware,
        LoggingMiddleware, MetricsMiddleware, MiddlewareChain, NoopMiddleware,
    };
}

//! # rust-agent-middlewares
//!
//! Rust middleware implementations aligned with `@langgraph-js/agent-middlewares` (TypeScript).
//!
//! ## Architecture
//!
//! ```text
//! ┌─────────────────────────────────────┐
//! │     Application Layer               │
//! ├─────────────────────────────────────┤
//! │  rust-agent-middlewares (本库)       │
//! │  ┌──────────────────────────────┐  │
//! │  │  FilesystemMiddleware        │  │  ← read/write/edit/glob/grep/folder
//! │  │  TerminalMiddleware          │  │  ← bash
//! │  └──────────────────────────────┘  │
//! ├─────────────────────────────────────┤
//! │     rust-create-agent               │  (框架层)
//! └─────────────────────────────────────┘
//! ```
//!
//! ## Quick Start
//!
//! ```rust,no_run
//! use rust_agent_middlewares::prelude::*;
//! use rust_create_agent::prelude::*;
//!
//! #[tokio::main]
//! async fn main() -> anyhow::Result<()> {
//!     let cwd = "/workspace";
//!     let llm = MockLLM::always_answer("Done!");
//!
//!     // 构建文件系统工具
//!     let fs_tools = FilesystemMiddleware::build_tools(cwd);
//!     let term_tools = TerminalMiddleware::build_tools(cwd);
//!
//!     let mut executor = AgentExecutor::new(llm)
//!         .add_middleware(Box::new(FilesystemMiddleware::new()))
//!         .add_middleware(Box::new(TerminalMiddleware::new()));
//!
//!     // 注册所有工具
//!     for tool in fs_tools.into_iter().chain(term_tools) {
//!         executor = executor.register_tool(tool);
//!     }
//!
//!     let mut state = AgentState::new(cwd);
//!     let output = executor.execute(AgentInput::text("List files"), &mut state).await?;
//!     println!("{}", output.text);
//!     Ok(())
//! }
//! ```

pub mod middleware;
pub mod tools;

/// Prelude - 常用类型一次性导入
pub mod prelude {
    pub use crate::middleware::{FilesystemMiddleware, TerminalMiddleware};
    pub use crate::tools::{
        EditFileTool, FolderOperationsTool, GlobFilesTool, ReadFileTool, SearchFilesRgTool,
        WriteFileTool,
    };

    // 重导出 rust-create-agent 核心类型
    pub use rust_create_agent::prelude::*;
}

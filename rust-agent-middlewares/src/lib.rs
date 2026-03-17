//! # rust-agent-middlewares
//!
//! Rust middleware implementations aligned with `@langgraph-js/agent-middlewares` (TypeScript).

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

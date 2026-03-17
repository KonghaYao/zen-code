//! # rust-agent-middlewares
//!
//! Rust middleware implementations aligned with `@langgraph-js/agent-middlewares` (TypeScript).
//!
//! ## 文件系统与终端（原 rust-agent-middlewares）
//! - [`middleware::FilesystemMiddleware`]：文件系统操作
//! - [`middleware::TerminalMiddleware`]：终端命令执行
//!
//! ## 认知增强与安全（原 rust-standard-middlewares）
//! - [`AgentsMdMiddleware`]：注入 AGENTS.md / CLAUDE.md 项目指引
//! - [`SkillsMiddleware`]：渐进式 Skills 摘要注入
//! - [`HumanInTheLoopMiddleware`]：敏感工具调用前需用户确认

pub mod agents_md;
pub mod ask_user;
pub mod hitl;
pub mod middleware;
pub mod skills;
pub mod tools;

pub use agents_md::AgentsMdMiddleware;
pub use ask_user::{
    ask_user_tool_definition, parse_ask_user, AskUserBatchRequest, AskUserHandler, AskUserOption,
    AskUserQuestionData,
};
pub use hitl::{
    default_requires_approval, BatchItem, HitlDecision, HitlHandler, HumanInTheLoopMiddleware,
};
pub use skills::SkillsMiddleware;

/// Prelude - 常用类型一次性导入
pub mod prelude {
    pub use crate::agents_md::AgentsMdMiddleware;
    pub use crate::ask_user::{
        ask_user_tool_definition, parse_ask_user, AskUserBatchRequest, AskUserHandler,
        AskUserOption, AskUserQuestionData,
    };
    pub use crate::hitl::{
        default_requires_approval, BatchItem, HitlDecision, HitlHandler, HumanInTheLoopMiddleware,
    };
    pub use crate::middleware::{FilesystemMiddleware, TerminalMiddleware};
    pub use crate::skills::{SkillMetadata, SkillsMiddleware};
    pub use crate::tools::{
        EditFileTool, FolderOperationsTool, GlobFilesTool, ReadFileTool, SearchFilesRgTool,
        WriteFileTool,
    };

    // 重导出 rust-create-agent 核心类型
    pub use rust_create_agent::prelude::*;
}

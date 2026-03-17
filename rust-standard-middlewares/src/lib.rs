//! # rust-standard-middlewares
//!
//! 框架层认知增强与安全中间件，对应 TypeScript `packages/standard-agent/src/middlewares/`。
//!
//! ## 已实现
//! - [`AgentsMdMiddleware`]：注入 AGENTS.md / CLAUDE.md 项目指引
//! - [`SkillsMiddleware`]：渐进式 Skills 摘要注入
//! - [`HumanInTheLoopMiddleware`]：敏感工具调用前需用户确认

pub mod agents_md;
pub mod ask_user;
pub mod hitl;
pub mod skills;

pub use agents_md::AgentsMdMiddleware;
pub use ask_user::{
    ask_user_tool_definition, parse_ask_user, AskUserBatchRequest, AskUserHandler,
    AskUserOption, AskUserQuestionData,
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
    pub use crate::skills::{SkillMetadata, SkillsMiddleware};
}

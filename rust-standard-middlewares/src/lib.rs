//! # rust-standard-middlewares
//!
//! 框架层认知增强中间件，对应 TypeScript `packages/standard-agent/src/middlewares/`。
//!
//! ## 已实现
//! - [`AgentsMdMiddleware`]：注入 AGENTS.md / CLAUDE.md 项目指引
//! - [`SkillsMiddleware`]：渐进式 Skills 摘要注入

pub mod agents_md;
pub mod skills;

pub use agents_md::AgentsMdMiddleware;
pub use skills::SkillsMiddleware;

/// Prelude - 常用类型一次性导入
pub mod prelude {
    pub use crate::agents_md::AgentsMdMiddleware;
    pub use crate::skills::{SkillMetadata, SkillsMiddleware};
}

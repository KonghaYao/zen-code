use std::sync::Arc;

use async_trait::async_trait;
use rust_create_agent::agent::react::ToolCall;
use rust_create_agent::agent::state::State;
use rust_create_agent::error::{AgentError, AgentResult};
use rust_create_agent::middleware::r#trait::Middleware;

// ─── HitlDecision ──────────────────────────────────────────────────────────────

/// 用户对工具调用的审批决策
#[derive(Debug, Clone)]
pub enum HitlDecision {
    /// 批准执行（原始参数）
    Approve,
    /// 编辑后执行（修改工具调用参数）
    Edit(serde_json::Value),
    /// 拒绝执行
    Reject,
    /// 拒绝并向 LLM 回复原因
    Respond(String),
}

// ─── HitlHandler ──────────────────────────────────────────────────────────────

/// 批量审批请求的单项
#[derive(Debug, Clone)]
pub struct BatchItem {
    pub tool_name: String,
    pub input: serde_json::Value,
}

/// HITL 审批回调 trait — 应用层实现（TUI 弹窗、CLI 提示等）
#[async_trait]
pub trait HitlHandler: Send + Sync {
    /// 判断此工具调用是否需要用户审批
    fn requires_approval(&self, tool_name: &str, input: &serde_json::Value) -> bool;

    /// 请求用户审批单个工具调用，挂起直到用户做出决策
    async fn request_approval(
        &self,
        tool_name: &str,
        input: &serde_json::Value,
    ) -> HitlDecision;

    /// 批量审批：一次展示多个待审批工具，返回与 items 等长的决策列表
    ///
    /// 默认实现：逐个串行调用 `request_approval`（退化为单次弹窗）。
    /// 应用层可覆盖为一次性弹窗展示所有项。
    async fn request_approval_batch(&self, items: &[BatchItem]) -> Vec<HitlDecision> {
        let mut results = Vec::with_capacity(items.len());
        for item in items {
            results.push(self.request_approval(&item.tool_name, &item.input).await);
        }
        results
    }
}

// ─── 默认规则 ──────────────────────────────────────────────────────────────────

/// 默认敏感工具判断规则（无注入时使用）
///
/// - `bash`：所有 bash 命令
/// - `write_*`：文件写入
/// - `edit_*`：文件编辑
/// - `folder_operations`：目录操作
pub fn default_requires_approval(tool_name: &str) -> bool {
    matches!(
        tool_name,
        "bash"
            | "write_file"
            | "edit_file"
            | "folder_operations"
    ) || tool_name.starts_with("write_")
        || tool_name.starts_with("edit_")
        || tool_name.starts_with("delete_")
        || tool_name.starts_with("rm_")
}

// ─── HumanInTheLoopMiddleware ──────────────────────────────────────────────────

/// HumanInTheLoopMiddleware — 敏感工具调用前需用户确认
///
/// 在 `before_tool` 时拦截工具调用，通过注入的 [`HitlHandler`] 请求用户审批。
///
/// # YOLO 模式
/// 通过 `HumanInTheLoopMiddleware::disabled()` 或环境变量 `YOLO_MODE=true` 禁用。
pub struct HumanInTheLoopMiddleware {
    handler: Option<Arc<dyn HitlHandler>>,
    enabled: bool,
}

impl HumanInTheLoopMiddleware {
    /// 创建启用的 HITL 中间件，使用注入的 handler
    pub fn new(handler: Arc<dyn HitlHandler>) -> Self {
        Self {
            handler: Some(handler),
            enabled: true,
        }
    }

    /// YOLO 模式：所有工具调用直接放行
    pub fn disabled() -> Self {
        Self {
            handler: None,
            enabled: false,
        }
    }

    /// 从环境变量决定是否启用（`YOLO_MODE=true` 则禁用）
    pub fn from_env(handler: Arc<dyn HitlHandler>) -> Self {
        let yolo = std::env::var("YOLO_MODE")
            .map(|v| v.eq_ignore_ascii_case("true") || v == "1")
            .unwrap_or(false);

        if yolo {
            Self::disabled()
        } else {
            Self::new(handler)
        }
    }
}

impl HumanInTheLoopMiddleware {
    /// 批量处理一批工具调用：收集所有需要审批的项，一次性弹窗，返回每个 call 的处理结果
    ///
    /// - 不需要审批的 call：直接 `Ok(call.clone())`
    /// - 需要审批的 call：整批发给 handler，按决策处理
    pub async fn process_batch(&self, calls: &[ToolCall]) -> Vec<AgentResult<ToolCall>> {
        // YOLO 模式：全部放行
        let Some(handler) = &self.handler else {
            return calls.iter().map(|c| Ok(c.clone())).collect();
        };
        if !self.enabled {
            return calls.iter().map(|c| Ok(c.clone())).collect();
        }

        // 分类：哪些需要审批，哪些直接放行
        let needs_approval: Vec<(usize, &ToolCall)> = calls
            .iter()
            .enumerate()
            .filter(|(_, c)| handler.requires_approval(&c.name, &c.input))
            .collect();

        // 没有需要审批的：全部放行
        if needs_approval.is_empty() {
            return calls.iter().map(|c| Ok(c.clone())).collect();
        }

        // 批量请求审批
        let batch_items: Vec<BatchItem> = needs_approval
            .iter()
            .map(|(_, c)| BatchItem {
                tool_name: c.name.clone(),
                input: c.input.clone(),
            })
            .collect();

        let decisions = handler.request_approval_batch(&batch_items).await;

        // 将决策映射回完整列表
        let mut approval_iter = decisions.into_iter();
        let mut results: Vec<AgentResult<ToolCall>> = calls.iter().map(|c| Ok(c.clone())).collect();

        for (idx, call) in needs_approval {
            let decision = approval_iter.next().unwrap_or(HitlDecision::Reject);
            results[idx] = match decision {
                HitlDecision::Approve => Ok(call.clone()),
                HitlDecision::Edit(new_input) => {
                    let mut modified = call.clone();
                    modified.input = new_input;
                    Ok(modified)
                }
                HitlDecision::Reject => Err(AgentError::ToolRejected {
                    tool: call.name.clone(),
                    reason: "用户拒绝".to_string(),
                }),
                HitlDecision::Respond(msg) => Err(AgentError::ToolRejected {
                    tool: call.name.clone(),
                    reason: msg,
                }),
            };
        }

        results
    }
}

#[async_trait]
impl<S: State> Middleware<S> for HumanInTheLoopMiddleware {
    fn name(&self) -> &str {
        "HumanInTheLoopMiddleware"
    }

    async fn before_tool(&self, _state: &mut S, tool_call: &ToolCall) -> AgentResult<ToolCall> {
        // YOLO 模式或未配置 handler：直接放行
        let Some(handler) = &self.handler else {
            return Ok(tool_call.clone());
        };
        if !self.enabled {
            return Ok(tool_call.clone());
        }

        // 不需要审批：直接放行
        if !handler.requires_approval(&tool_call.name, &tool_call.input) {
            return Ok(tool_call.clone());
        }

        // 请求审批
        match handler.request_approval(&tool_call.name, &tool_call.input).await {
            HitlDecision::Approve => Ok(tool_call.clone()),
            HitlDecision::Edit(new_input) => {
                let mut modified = tool_call.clone();
                modified.input = new_input;
                Ok(modified)
            }
            HitlDecision::Reject => Err(AgentError::ToolRejected {
                tool: tool_call.name.clone(),
                reason: "用户拒绝".to_string(),
            }),
            HitlDecision::Respond(msg) => Err(AgentError::ToolRejected {
                tool: tool_call.name.clone(),
                reason: msg,
            }),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_create_agent::agent::state::AgentState;

    struct AutoApproveHandler;

    #[async_trait]
    impl HitlHandler for AutoApproveHandler {
        fn requires_approval(&self, tool_name: &str, _input: &serde_json::Value) -> bool {
            default_requires_approval(tool_name)
        }

        async fn request_approval(
            &self,
            _tool_name: &str,
            _input: &serde_json::Value,
        ) -> HitlDecision {
            HitlDecision::Approve
        }
    }

    struct AutoRejectHandler;

    #[async_trait]
    impl HitlHandler for AutoRejectHandler {
        fn requires_approval(&self, _tool_name: &str, _input: &serde_json::Value) -> bool {
            true
        }

        async fn request_approval(
            &self,
            _tool_name: &str,
            _input: &serde_json::Value,
        ) -> HitlDecision {
            HitlDecision::Reject
        }
    }

    fn make_tool_call(name: &str) -> ToolCall {
        ToolCall {
            id: "test-id".to_string(),
            name: name.to_string(),
            input: serde_json::json!({"command": "ls"}),
        }
    }

    #[tokio::test]
    async fn test_disabled_allows_all() {
        let mw = HumanInTheLoopMiddleware::disabled();
        let mut state = AgentState::new("/tmp");
        let tc = make_tool_call("bash");
        let result = mw.before_tool(&mut state, &tc).await.unwrap();
        assert_eq!(result.name, "bash");
    }

    #[tokio::test]
    async fn test_approve_passes_through() {
        let mw = HumanInTheLoopMiddleware::new(Arc::new(AutoApproveHandler));
        let mut state = AgentState::new("/tmp");
        let tc = make_tool_call("bash");
        let result = mw.before_tool(&mut state, &tc).await.unwrap();
        assert_eq!(result.name, "bash");
    }

    #[tokio::test]
    async fn test_reject_returns_error() {
        let mw = HumanInTheLoopMiddleware::new(Arc::new(AutoRejectHandler));
        let mut state = AgentState::new("/tmp");
        let tc = make_tool_call("bash");
        let result = mw.before_tool(&mut state, &tc).await;
        assert!(matches!(result, Err(AgentError::ToolRejected { .. })));
    }

    #[tokio::test]
    async fn test_read_file_not_intercepted() {
        let mw = HumanInTheLoopMiddleware::new(Arc::new(AutoApproveHandler));
        let mut state = AgentState::new("/tmp");
        let tc = make_tool_call("read_file");
        // read_file 不在默认敏感列表，AutoApproveHandler 按 default_requires_approval 判断
        let result = mw.before_tool(&mut state, &tc).await.unwrap();
        assert_eq!(result.name, "read_file");
    }

    #[test]
    fn test_default_requires_approval() {
        assert!(default_requires_approval("bash"));
        assert!(default_requires_approval("write_file"));
        assert!(default_requires_approval("edit_file"));
        assert!(default_requires_approval("folder_operations"));
        assert!(default_requires_approval("delete_something"));
        assert!(!default_requires_approval("read_file"));
        assert!(!default_requires_approval("glob_files"));
        assert!(!default_requires_approval("search_files_rg"));
    }
}

use async_trait::async_trait;
use langchain_rust::tools::Tool;
use rust_create_agent::agent::state::State;
use rust_create_agent::error::AgentResult;
use rust_create_agent::middleware::r#trait::Middleware;

use crate::tools::{
    EditFileTool, FolderOperationsTool, GlobFilesTool, ReadFileTool, SearchFilesRgTool,
    WriteFileTool,
};

/// FilesystemMiddleware - 与 TypeScript FilesystemMiddleware 对齐
///
/// 封装所有文件系统工具（read / write / edit / glob / grep / folder），
/// 并在 `before_agent` 时将工具注册到执行器上（通过 state 中携带的工具注入点）。
///
/// ## Available Tools
/// - `read_file`       - 读取文件内容（支持行偏移和限制）
/// - `write_file`      - 写入文件内容
/// - `edit_file`       - 精确字符串替换
/// - `glob_files`      - 按文件名 glob 模式搜索
/// - `search_files_rg` - ripgrep 文本搜索
/// - `folder_operations` - 文件夹创建/列举/存在检查
///
/// ## Usage
/// ```rust,no_run
/// use rust_agent_middlewares::middleware::FilesystemMiddleware;
///
/// let fs_mw = FilesystemMiddleware::new();
/// let executor = AgentExecutor::new(llm)
///     .add_middleware(Box::new(fs_mw));
/// ```
pub struct FilesystemMiddleware;

impl FilesystemMiddleware {
    pub fn new() -> Self {
        Self
    }

    /// 根据 cwd 构建所有文件系统工具
    pub fn build_tools(cwd: &str) -> Vec<Box<dyn Tool>> {
        vec![
            Box::new(ReadFileTool::new(cwd)),
            Box::new(WriteFileTool::new(cwd)),
            Box::new(EditFileTool::new(cwd)),
            Box::new(GlobFilesTool::new(cwd)),
            Box::new(SearchFilesRgTool::new(cwd)),
            Box::new(FolderOperationsTool::new(cwd)),
        ]
    }

    /// 返回所有工具名称列表（用于文档/日志）
    pub fn tool_names() -> Vec<&'static str> {
        vec![
            "read_file",
            "write_file",
            "edit_file",
            "glob_files",
            "search_files_rg",
            "folder_operations",
        ]
    }
}

impl Default for FilesystemMiddleware {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl<S: State> Middleware<S> for FilesystemMiddleware {
    fn name(&self) -> &str {
        "FilesystemMiddleware"
    }

    /// 在 Agent 执行前记录可用工具（工具已在 AgentExecutor 构建时通过 build_tools 注册）
    async fn before_agent(&self, state: &mut S) -> AgentResult<()> {
        let tools = Self::tool_names().join(", ");
        println!(
            "[FilesystemMiddleware] cwd: {} | tools: {tools}",
            state.cwd()
        );
        Ok(())
    }
}

use async_trait::async_trait;
use rust_create_agent::agent::state::State;
use rust_create_agent::error::AgentResult;
use rust_create_agent::middleware::r#trait::Middleware;
use rust_create_agent::tools::BaseTool;

use crate::tools::{
    EditFileTool, FolderOperationsTool, GlobFilesTool, ReadFileTool, SearchFilesRgTool,
    WriteFileTool,
};

/// FilesystemMiddleware - 与 TypeScript FilesystemMiddleware 对齐
pub struct FilesystemMiddleware;

impl FilesystemMiddleware {
    pub fn new() -> Self {
        Self
    }

    pub fn build_tools(cwd: &str) -> Vec<Box<dyn BaseTool>> {
        vec![
            Box::new(ReadFileTool::new(cwd)),
            Box::new(WriteFileTool::new(cwd)),
            Box::new(EditFileTool::new(cwd)),
            Box::new(GlobFilesTool::new(cwd)),
            Box::new(SearchFilesRgTool::new(cwd)),
            Box::new(FolderOperationsTool::new(cwd)),
        ]
    }

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

    async fn before_agent(&self, state: &mut S) -> AgentResult<()> {
        let tools = Self::tool_names().join(", ");
        println!(
            "[FilesystemMiddleware] cwd: {} | tools: {tools}",
            state.cwd()
        );
        Ok(())
    }
}

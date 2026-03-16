use langchain_rust::tools::Tool;
use serde_json::Value;
use std::path::Path;

/// write_file tool - 与 TypeScript write_tool 对齐
pub struct WriteFileTool {
    pub cwd: String,
}

impl WriteFileTool {
    pub fn new(cwd: impl Into<String>) -> Self {
        Self { cwd: cwd.into() }
    }
}

#[async_trait::async_trait]
impl Tool for WriteFileTool {
    fn name(&self) -> String {
        "write_file".to_string()
    }

    fn description(&self) -> String {
        r#"Writes a file to the local filesystem. Relative paths are resolved based on the current working directory (cwd).

Usage:
- This tool will overwrite the existing file if there is one at the provided path.
- If this is an existing file, you MUST use the Read tool first to read the file's contents.
- ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required.

Parameters (JSON):
  file_path: string (required) - path to the file
  content: string (required) - content to write"#
            .to_string()
    }

    fn parameters(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "file_path": { "type": "string", "description": "Path to the file (absolute or relative to cwd)" },
                "content":   { "type": "string", "description": "Content to write to the file" }
            },
            "required": ["file_path", "content"]
        })
    }

    async fn run(&self, input: Value) -> Result<String, Box<dyn std::error::Error>> {
        let file_path = input["file_path"]
            .as_str()
            .ok_or("Missing file_path parameter")?;
        let content = input["content"]
            .as_str()
            .ok_or("Missing content parameter")?;

        let resolved = if Path::new(file_path).is_absolute() {
            Path::new(file_path).to_path_buf()
        } else {
            Path::new(&self.cwd).join(file_path)
        };

        // 自动创建父目录
        if let Some(parent) = resolved.parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent)?;
            }
        }

        match std::fs::write(&resolved, content) {
            Ok(_) => Ok(format!(
                "File {} has been written successfully.",
                resolved.display()
            )),
            Err(e) => Ok(format!("Error writing file: {e}")),
        }
    }

    async fn parse_input(&self, input: &str) -> Value {
        super::parse_json_input(input).await
    }
}

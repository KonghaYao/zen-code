pub mod edit;
pub mod folder;
pub mod glob;
pub mod grep;
pub mod read;
pub mod write;

pub use edit::EditFileTool;
pub use folder::FolderOperationsTool;
pub use glob::GlobFilesTool;
pub use grep::SearchFilesRgTool;
pub use read::ReadFileTool;
pub use write::WriteFileTool;

/// langchain-rust 默认的 parse_input 会把 JSON object 拆成 input["input"] 字符串，
/// 导致工具收到的不是完整 JSON。此函数直接把输入字符串解析为 Value 原样传入。
pub async fn parse_json_input(input: &str) -> serde_json::Value {
    serde_json::from_str(input).unwrap_or(serde_json::Value::String(input.to_string()))
}

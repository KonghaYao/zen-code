use langchain_rust::tools::Tool;
use serde_json::Value;
use std::path::Path;
use std::process::Stdio;
use tokio::process::Command;
use tokio::time::{timeout, Duration};

/// search_files_rg tool - 与 TypeScript grep_tool 对齐
///
/// 包装 ripgrep (rg) 命令，提供快速文本搜索。
pub struct SearchFilesRgTool {
    pub cwd: String,
}

impl SearchFilesRgTool {
    pub fn new(cwd: impl Into<String>) -> Self {
        Self { cwd: cwd.into() }
    }
}

/// 解析最后一个路径参数（非 flag），基于 cwd 解析相对路径
fn resolve_last_path_arg(args: &mut Vec<String>, cwd: &str) {
    if let Some(last) = args.last_mut() {
        if !last.starts_with('-') {
            let p = Path::new(last.as_str());
            if !p.is_absolute() {
                *last = Path::new(cwd).join(p).to_string_lossy().to_string();
            }
        }
    }
}

#[async_trait::async_trait]
impl Tool for SearchFilesRgTool {
    fn name(&self) -> String {
        "search_files_rg".to_string()
    }

    fn description(&self) -> String {
        r#"Ripgrep (rg) - A fast text search tool that recursively searches directories for regex patterns.

IMPORTANT: MUST always specify a search path at the end of args array.

Parameters (JSON):
  args: string[] (required) - ripgrep arguments array. Format: [OPTIONS...] PATTERN [PATH...]
    Examples:
      ["PATTERN", "./"]
      ["-n", "-i", "function", "./"]
      ["--type", "rs", "fn main", "src/"]
  head_limit: number (optional) - limit output to first N lines (default 500)"#
            .to_string()
    }

    async fn run(&self, input: Value) -> Result<String, Box<dyn std::error::Error>> {
        let args_val = input["args"]
            .as_array()
            .ok_or("Missing args parameter (array of strings)")?;

        if args_val.is_empty() {
            return Ok("Error: No arguments provided. Please provide ripgrep arguments.".to_string());
        }

        let mut args: Vec<String> = args_val
            .iter()
            .filter_map(|v| v.as_str().map(|s| s.to_string()))
            .collect();

        let head_limit = input["head_limit"].as_u64().unwrap_or(500) as usize;

        // 解析最后的路径参数
        resolve_last_path_arg(&mut args, &self.cwd);

        // 查找 rg 可执行文件
        let rg_bin = which_rg();

        // 15 秒超时执行 rg
        let output = timeout(
            Duration::from_secs(15),
            Command::new(&rg_bin)
                .args(&args)
                .current_dir(&self.cwd)
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .output(),
        )
        .await;

        match output {
            Err(_) => Ok(
                "Error: Search timed out after 15 seconds. Please use a more specific pattern."
                    .to_string(),
            ),
            Ok(Err(e)) => Ok(format!("Error executing ripgrep: {e}")),
            Ok(Ok(out)) => {
                let stdout = String::from_utf8_lossy(&out.stdout).to_string();
                let stderr = String::from_utf8_lossy(&out.stderr).to_string();

                if !out.status.success() && stdout.is_empty() {
                    if stderr.is_empty() {
                        return Ok("No matches found.".to_string());
                    }
                    return Ok(format!("Error executing ripgrep: {stderr}"));
                }

                // 应用行数限制
                let result = if stdout.is_empty() {
                    "No matches found.".to_string()
                } else {
                    let lines: Vec<&str> = stdout.split('\n').collect();
                    if lines.len() > head_limit {
                        lines[..head_limit].join("\n")
                    } else {
                        stdout
                    }
                };

                Ok(result)
            }
        }
    }
}

/// 查找 rg 路径（优先使用 PATH 中的，找不到时报错）
fn which_rg() -> String {
    // 尝试常见路径
    for candidate in &[
        "rg",
        "/usr/local/bin/rg",
        "/opt/homebrew/bin/rg",
        "/usr/bin/rg",
    ] {
        if std::process::Command::new(candidate)
            .arg("--version")
            .output()
            .is_ok()
        {
            return candidate.to_string();
        }
    }
    "rg".to_string()
}

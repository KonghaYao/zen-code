use async_trait::async_trait;
use langchain_rust::tools::Tool;
use rust_create_agent::agent::state::State;
use rust_create_agent::error::AgentResult;
use rust_create_agent::middleware::r#trait::Middleware;
use serde_json::Value;
use std::process::Stdio;
use tokio::process::Command;
use tokio::time::{timeout, Duration};

/// BashTool - 终端命令执行工具，与 TypeScript TerminalMiddleware 对齐
pub struct BashTool {
    pub cwd: String,
}

impl BashTool {
    pub fn new(cwd: impl Into<String>) -> Self {
        Self { cwd: cwd.into() }
    }
}

#[async_trait::async_trait]
impl Tool for BashTool {
    fn name(&self) -> String {
        "bash".to_string()
    }

    fn description(&self) -> String {
        r#"Execute shell commands in a persistent working directory context.

Usage:
- Commands run with the current working directory (cwd) as the base
- Supports chaining commands with && or ;
- Timeout: 120 seconds per command
- Prefer non-interactive commands

Parameters (JSON):
  command: string (required) - the shell command to execute
  timeout_secs: number (optional, default 120) - command timeout in seconds"#
            .to_string()
    }

    async fn run(&self, input: Value) -> Result<String, Box<dyn std::error::Error>> {
        let command = input["command"]
            .as_str()
            .ok_or("Missing command parameter")?;

        let timeout_secs = input["timeout_secs"].as_u64().unwrap_or(120);

        // 选择 shell（macOS/Linux 用 bash，Windows 用 cmd）
        let (shell, flag) = if cfg!(target_os = "windows") {
            ("cmd", "/C")
        } else {
            ("bash", "-c")
        };

        let result = timeout(
            Duration::from_secs(timeout_secs),
            Command::new(shell)
                .arg(flag)
                .arg(command)
                .current_dir(&self.cwd)
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .output(),
        )
        .await;

        match result {
            Err(_) => Ok(format!(
                "Error: Command timed out after {timeout_secs} seconds.\nCommand: {command}"
            )),
            Ok(Err(e)) => Ok(format!("Error executing command: {e}")),
            Ok(Ok(out)) => {
                let stdout = String::from_utf8_lossy(&out.stdout).to_string();
                let stderr = String::from_utf8_lossy(&out.stderr).to_string();
                let exit_code = out.status.code().unwrap_or(-1);

                let mut output = String::new();

                if !stdout.is_empty() {
                    output.push_str(&stdout);
                }
                if !stderr.is_empty() {
                    if !output.is_empty() {
                        output.push('\n');
                    }
                    output.push_str("[stderr]\n");
                    output.push_str(&stderr);
                }
                if exit_code != 0 {
                    output.push_str(&format!("\n[Exit code: {exit_code}]"));
                }

                if output.is_empty() {
                    output = format!("[Command completed with exit code {exit_code}]");
                }

                Ok(output)
            }
        }
    }
}

/// TerminalMiddleware - 与 TypeScript TerminalMiddleware 对齐
///
/// 提供终端命令执行能力（bash/cmd）。
pub struct TerminalMiddleware;

impl TerminalMiddleware {
    pub fn new() -> Self {
        Self
    }

    /// 构建终端工具列表
    pub fn build_tools(cwd: &str) -> Vec<Box<dyn Tool>> {
        vec![Box::new(BashTool::new(cwd))]
    }

    pub fn tool_names() -> Vec<&'static str> {
        vec!["bash"]
    }
}

impl Default for TerminalMiddleware {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl<S: State> Middleware<S> for TerminalMiddleware {
    fn name(&self) -> &str {
        "TerminalMiddleware"
    }

    async fn before_agent(&self, state: &mut S) -> AgentResult<()> {
        println!(
            "[TerminalMiddleware] cwd: {} | tools: bash",
            state.cwd()
        );
        Ok(())
    }
}

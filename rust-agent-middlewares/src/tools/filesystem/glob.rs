use langchain_rust::tools::Tool;
use serde_json::Value;
use std::path::Path;

/// glob_files tool - 与 TypeScript glob_tool 对齐
pub struct GlobFilesTool {
    pub cwd: String,
}

impl GlobFilesTool {
    pub fn new(cwd: impl Into<String>) -> Self {
        Self { cwd: cwd.into() }
    }
}

/// 跳过常见构建/依赖目录
fn should_skip_dir(name: &str) -> bool {
    matches!(
        name,
        "node_modules"
            | ".git"
            | "dist"
            | "build"
            | ".next"
            | ".turbo"
            | "coverage"
            | ".nyc_output"
            | "temp"
            | ".cache"
            | "vendor"
            | "venv"
            | "__pycache__"
            | "target"
            | "out"
            | ".output"
    )
}

/// 简单 glob 匹配（支持 * 和 **）
fn glob_match(pattern: &str, path: &str) -> bool {
    glob::Pattern::new(pattern)
        .map(|p| p.matches(path))
        .unwrap_or(false)
}

/// 递归遍历目录，收集匹配文件的绝对路径
fn collect_files(base: &Path, pattern: &str, results: &mut Vec<String>) {
    let walker = walkdir::WalkDir::new(base)
        .follow_links(true)
        .into_iter()
        .filter_entry(|e| {
            if e.file_type().is_dir() {
                let name = e.file_name().to_string_lossy();
                !should_skip_dir(&name)
            } else {
                true
            }
        });

    for entry in walker.flatten() {
        if entry.file_type().is_file() {
            let abs_path = entry.path().to_string_lossy().to_string();
            // 用相对于 base 的路径做匹配
            if let Ok(rel) = entry.path().strip_prefix(base) {
                let rel_str = rel.to_string_lossy().replace('\\', "/");
                if glob_match(pattern, &rel_str) {
                    results.push(abs_path);
                }
            }
        }
    }
}

#[async_trait::async_trait]
impl Tool for GlobFilesTool {
    fn name(&self) -> String {
        "glob_files".to_string()
    }

    fn description(&self) -> String {
        r#"Fast file pattern matching tool that works with any codebase size.
Supports glob patterns like "**/*.rs" or "src/**/*.ts".
Returns matching file paths sorted by modification time.

Parameters (JSON):
  pattern: string (required) - the glob pattern to match files against
  path: string (optional) - directory to search in (absolute or relative to cwd)"#
            .to_string()
    }

    async fn run(&self, input: Value) -> Result<String, Box<dyn std::error::Error>> {
        let pattern = input["pattern"]
            .as_str()
            .ok_or("Missing pattern parameter")?;

        let search_root = if let Some(p) = input["path"].as_str() {
            if Path::new(p).is_absolute() {
                Path::new(p).to_path_buf()
            } else {
                Path::new(&self.cwd).join(p)
            }
        } else {
            Path::new(&self.cwd).to_path_buf()
        };

        if !search_root.exists() {
            return Ok(format!(
                "Error: Directory not found: {}",
                search_root.display()
            ));
        }

        let mut results = Vec::new();
        collect_files(&search_root, pattern, &mut results);

        // 按修改时间排序
        results.sort_by(|a, b| {
            let ta = std::fs::metadata(a)
                .and_then(|m| m.modified())
                .ok();
            let tb = std::fs::metadata(b)
                .and_then(|m| m.modified())
                .ok();
            tb.cmp(&ta)
        });

        if results.is_empty() {
            Ok("No files found.".to_string())
        } else {
            Ok(results.join("\n"))
        }
    }
}

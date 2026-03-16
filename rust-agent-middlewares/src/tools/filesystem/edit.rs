use langchain_rust::tools::Tool;
use serde_json::Value;
use std::path::Path;

/// edit_file tool (replace) - 与 TypeScript replace_tool 对齐
///
/// 对文件执行精确字符串替换。
pub struct EditFileTool {
    pub cwd: String,
}

impl EditFileTool {
    pub fn new(cwd: impl Into<String>) -> Self {
        Self { cwd: cwd.into() }
    }
}

#[async_trait::async_trait]
impl Tool for EditFileTool {
    fn name(&self) -> String {
        "edit_file".to_string()
    }

    fn description(&self) -> String {
        r#"Performs exact string replacements in files. Relative paths are resolved based on the current working directory (cwd).

Usage:
- You must use your Read tool at least once before editing.
- The edit will FAIL if old_string is not unique in the file. Either provide more context or use replace_all.
- Use replace_all for replacing and renaming strings across the file.

Parameters (JSON):
  file_path: string (required) - path to the file to modify
  old_string: string (required) - the text to replace
  new_string: string (required) - the text to replace it with
  replace_all: bool (optional, default false) - replace all occurrences"#
            .to_string()
    }

    async fn run(&self, input: Value) -> Result<String, Box<dyn std::error::Error>> {
        let file_path = input["file_path"]
            .as_str()
            .ok_or("Missing file_path parameter")?;
        let old_string = input["old_string"]
            .as_str()
            .ok_or("Missing old_string parameter")?;
        let new_string = input["new_string"]
            .as_str()
            .ok_or("Missing new_string parameter")?;
        let replace_all = input["replace_all"].as_bool().unwrap_or(false);

        let resolved = if Path::new(file_path).is_absolute() {
            Path::new(file_path).to_path_buf()
        } else {
            Path::new(&self.cwd).join(file_path)
        };

        let content = match std::fs::read_to_string(&resolved) {
            Ok(c) => c,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                return Ok(format!("Error: File not found at {file_path}"));
            }
            Err(e) => return Err(e.into()),
        };

        if replace_all {
            if !content.contains(old_string) {
                return Ok(format!(
                    "Error: old_string not found in {}",
                    resolved.display()
                ));
            }
            let new_content = content.replace(old_string, new_string);
            std::fs::write(&resolved, new_content)?;
            Ok(format!(
                "File {} has been edited successfully. Replaced all occurrences of old_string.",
                resolved.display()
            ))
        } else {
            let occurrences = content.matches(old_string).count();
            if occurrences == 0 {
                return Ok(format!(
                    "Error: old_string not found in {}",
                    resolved.display()
                ));
            }
            if occurrences > 1 {
                return Ok(format!(
                    "Error: old_string is not unique in {} (found {} occurrences). \
                     Please provide more context or set replace_all to true.",
                    resolved.display(),
                    occurrences
                ));
            }
            // 精确一处
            let new_content = content.replacen(old_string, new_string, 1);
            std::fs::write(&resolved, new_content)?;
            Ok(format!(
                "File {} has been edited successfully. Replaced single occurrence of old_string.",
                resolved.display()
            ))
        }
    }
}

use serde::{Deserialize, Serialize};

// ─── ContentBlock ─────────────────────────────────────────────────────────────

/// 图片数据来源
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case", tag = "type")]
pub enum ImageSource {
    /// Base64 编码的图片数据
    Base64 {
        media_type: String, // "image/jpeg" | "image/png" | "image/gif" | "image/webp"
        data: String,
    },
    /// 远端 URL（OpenAI image_url 格式）
    Url { url: String },
}

/// 文档数据来源
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case", tag = "type")]
pub enum DocumentSource {
    Base64 { media_type: String, data: String },
    Url { url: String },
    Text { text: String },
}

/// 标准 ContentBlock — 对齐 LangChain JS contentBlocks
///
/// 每个 variant 对应 LangChain 文档中的 Standard content block 类型。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ContentBlock {
    /// 纯文本
    Text { text: String },

    /// 图片（多模态）
    Image { source: ImageSource },

    /// 文档（Anthropic Documents beta）
    Document {
        source: DocumentSource,
        #[serde(skip_serializing_if = "Option::is_none")]
        title: Option<String>,
    },

    /// AI 发出的工具调用（server-side tool call）
    ToolUse {
        id: String,
        name: String,
        input: serde_json::Value,
    },

    /// 工具执行结果
    ToolResult {
        tool_use_id: String,
        content: Vec<ContentBlock>,
        #[serde(default)]
        is_error: bool,
    },

    /// 推理 / CoT 内容（Anthropic thinking / OpenAI reasoning）
    Reasoning {
        text: String,
        /// Anthropic extended thinking 签名（用于缓存校验）
        #[serde(skip_serializing_if = "Option::is_none")]
        signature: Option<String>,
    },

    /// Provider 原生 block（透传，不做解析）
    ///
    /// 存储无法识别的原始 JSON，保证向前兼容。
    #[serde(other)]
    Unknown,
}

impl ContentBlock {
    pub fn text(text: impl Into<String>) -> Self {
        Self::Text { text: text.into() }
    }

    pub fn image_url(url: impl Into<String>) -> Self {
        Self::Image {
            source: ImageSource::Url { url: url.into() },
        }
    }

    pub fn image_base64(media_type: impl Into<String>, data: impl Into<String>) -> Self {
        Self::Image {
            source: ImageSource::Base64 {
                media_type: media_type.into(),
                data: data.into(),
            },
        }
    }

    pub fn tool_use(
        id: impl Into<String>,
        name: impl Into<String>,
        input: serde_json::Value,
    ) -> Self {
        Self::ToolUse {
            id: id.into(),
            name: name.into(),
            input,
        }
    }

    pub fn tool_result(
        tool_use_id: impl Into<String>,
        content: Vec<ContentBlock>,
        is_error: bool,
    ) -> Self {
        Self::ToolResult {
            tool_use_id: tool_use_id.into(),
            content,
            is_error,
        }
    }

    pub fn reasoning(text: impl Into<String>) -> Self {
        Self::Reasoning { text: text.into(), signature: None }
    }

    pub fn reasoning_with_signature(
        text: impl Into<String>,
        signature: impl Into<String>,
    ) -> Self {
        Self::Reasoning {
            text: text.into(),
            signature: Some(signature.into()),
        }
    }

    /// 若是 TextBlock，返回文字内容
    pub fn as_text(&self) -> Option<&str> {
        match self {
            Self::Text { text } => Some(text),
            _ => None,
        }
    }

    /// 若是 ToolUse，返回 (id, name, input)
    pub fn as_tool_use(&self) -> Option<(&str, &str, &serde_json::Value)> {
        match self {
            Self::ToolUse { id, name, input } => Some((id, name, input)),
            _ => None,
        }
    }

    /// 若是 Reasoning，返回文字
    pub fn as_reasoning(&self) -> Option<&str> {
        match self {
            Self::Reasoning { text, .. } => Some(text),
            _ => None,
        }
    }
}

// ─── MessageContent ────────────────────────────────────────────────────────────

/// 消息内容 — 对齐 LangChain JS content 属性
///
/// 支持三种形式（与 LangChain JS 文档一一对应）：
///
/// 1. `String`                  — 纯文本（最常见）
/// 2. `Blocks(Vec<ContentBlock>)` — 标准 ContentBlock 列表（跨 provider 兼容）
/// 3. `Raw(Vec<serde_json::Value>)` — Provider 原生格式（透传）
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(untagged)]
pub enum MessageContent {
    /// 纯文本
    Text(String),
    /// 标准 content blocks（type-safe）
    Blocks(Vec<ContentBlock>),
    /// Provider 原生格式（raw JSON objects）
    Raw(Vec<serde_json::Value>),
}

impl MessageContent {
    /// 从字符串构建
    pub fn text(s: impl Into<String>) -> Self {
        Self::Text(s.into())
    }

    /// 从 ContentBlock 列表构建
    pub fn blocks(blocks: Vec<ContentBlock>) -> Self {
        Self::Blocks(blocks)
    }

    /// 从 provider 原生 JSON 列表构建
    pub fn raw(values: Vec<serde_json::Value>) -> Self {
        Self::Raw(values)
    }

    /// 提取所有文本内容（拼接多个 text block）
    pub fn text_content(&self) -> String {
        match self {
            Self::Text(s) => s.clone(),
            Self::Blocks(blocks) => blocks
                .iter()
                .filter_map(|b| b.as_text())
                .collect::<Vec<_>>()
                .join(""),
            Self::Raw(values) => values
                .iter()
                .filter(|v| v["type"].as_str() == Some("text"))
                .filter_map(|v| v["text"].as_str())
                .collect::<Vec<_>>()
                .join(""),
        }
    }

    /// 懒解析为标准 ContentBlock 列表（对齐 LangChain JS `contentBlocks` 属性）
    ///
    /// - `Text(s)` → `[ContentBlock::Text { text: s }]`
    /// - `Blocks(v)` → 直接返回
    /// - `Raw(v)` → 尝试按 type 字段解析为已知 block
    pub fn content_blocks(&self) -> Vec<ContentBlock> {
        match self {
            Self::Text(s) => {
                if s.is_empty() {
                    vec![]
                } else {
                    vec![ContentBlock::text(s.clone())]
                }
            }
            Self::Blocks(blocks) => blocks.clone(),
            Self::Raw(values) => values
                .iter()
                .map(|v| {
                    // 尝试反序列化为标准 ContentBlock
                    serde_json::from_value::<ContentBlock>(v.clone())
                        .unwrap_or(ContentBlock::Unknown)
                })
                .collect(),
        }
    }

    /// 是否为空内容
    pub fn is_empty(&self) -> bool {
        match self {
            Self::Text(s) => s.is_empty(),
            Self::Blocks(b) => b.is_empty(),
            Self::Raw(v) => v.is_empty(),
        }
    }

    /// 是否包含工具调用 block
    pub fn has_tool_use(&self) -> bool {
        self.content_blocks()
            .iter()
            .any(|b| matches!(b, ContentBlock::ToolUse { .. }))
    }

    /// 提取所有 ToolUse blocks
    pub fn tool_use_blocks(&self) -> Vec<(&str, &str, &serde_json::Value)> {
        // 仅对 Blocks 变体有效（避免克隆），Raw/Text 走 content_blocks() 路径
        match self {
            Self::Blocks(blocks) => blocks.iter().filter_map(|b| b.as_tool_use()).collect(),
            _ => vec![],
        }
    }
}

impl Default for MessageContent {
    fn default() -> Self {
        Self::Text(String::new())
    }
}

impl From<String> for MessageContent {
    fn from(s: String) -> Self {
        Self::Text(s)
    }
}

impl From<&str> for MessageContent {
    fn from(s: &str) -> Self {
        Self::Text(s.to_string())
    }
}

impl From<Vec<ContentBlock>> for MessageContent {
    fn from(blocks: Vec<ContentBlock>) -> Self {
        Self::Blocks(blocks)
    }
}

// ─── ToolCallRequest ──────────────────────────────────────────────────────────

/// 工具调用请求（对应 OpenAI tool_calls / Anthropic tool_use blocks）
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ToolCallRequest {
    pub id: String,
    pub name: String,
    pub arguments: serde_json::Value,
}

impl ToolCallRequest {
    pub fn new(
        id: impl Into<String>,
        name: impl Into<String>,
        arguments: serde_json::Value,
    ) -> Self {
        Self {
            id: id.into(),
            name: name.into(),
            arguments,
        }
    }
}

// ─── BaseMessage ──────────────────────────────────────────────────────────────

/// BaseMessage - 统一消息类型，对齐 LangChain BaseMessage
///
/// `content` 字段为 `MessageContent`，支持：
/// - 纯文本字符串
/// - 标准 ContentBlock 列表（多模态、推理内容等）
/// - Provider 原生格式（透传）
///
/// `content_blocks()` 方法懒解析，对齐 LangChain JS 的 `contentBlocks` 属性。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "role")]
pub enum BaseMessage {
    #[serde(rename = "user")]
    Human { content: MessageContent },

    #[serde(rename = "assistant")]
    Ai {
        content: MessageContent,
        #[serde(default, skip_serializing_if = "Vec::is_empty")]
        tool_calls: Vec<ToolCallRequest>,
    },

    #[serde(rename = "system")]
    System { content: MessageContent },

    #[serde(rename = "tool")]
    Tool {
        tool_call_id: String,
        content: MessageContent,
        #[serde(default)]
        is_error: bool,
    },
}

impl BaseMessage {
    // ── 构造器（字符串快捷方式）────────────────────────────────────────────────

    pub fn human(content: impl Into<MessageContent>) -> Self {
        Self::Human { content: content.into() }
    }

    pub fn ai(content: impl Into<MessageContent>) -> Self {
        Self::Ai {
            content: content.into(),
            tool_calls: Vec::new(),
        }
    }

    pub fn ai_with_tool_calls(
        content: impl Into<MessageContent>,
        tool_calls: Vec<ToolCallRequest>,
    ) -> Self {
        Self::Ai {
            content: content.into(),
            tool_calls,
        }
    }

    /// 构造带 ContentBlock 列表的 AI 消息（含工具调用 block）
    ///
    /// `blocks` 中的 `ToolUse` block 会被同步提取到 `tool_calls`，保持一致性。
    pub fn ai_from_blocks(blocks: Vec<ContentBlock>) -> Self {
        let tool_calls: Vec<ToolCallRequest> = blocks
            .iter()
            .filter_map(|b| {
                if let ContentBlock::ToolUse { id, name, input } = b {
                    Some(ToolCallRequest::new(id.clone(), name.clone(), input.clone()))
                } else {
                    None
                }
            })
            .collect();
        Self::Ai {
            content: MessageContent::Blocks(blocks),
            tool_calls,
        }
    }

    pub fn system(content: impl Into<MessageContent>) -> Self {
        Self::System { content: content.into() }
    }

    pub fn tool_result(id: impl Into<String>, content: impl Into<MessageContent>) -> Self {
        Self::Tool {
            tool_call_id: id.into(),
            content: content.into(),
            is_error: false,
        }
    }

    pub fn tool_error(id: impl Into<String>, error: impl Into<MessageContent>) -> Self {
        Self::Tool {
            tool_call_id: id.into(),
            content: error.into(),
            is_error: true,
        }
    }

    // ── 访问器 ────────────────────────────────────────────────────────────────

    /// 获取消息 `MessageContent` 引用
    pub fn message_content(&self) -> &MessageContent {
        match self {
            Self::Human { content } => content,
            Self::Ai { content, .. } => content,
            Self::System { content } => content,
            Self::Tool { content, .. } => content,
        }
    }

    /// 获取纯文本内容（拼接所有 text block）
    ///
    /// 对齐旧接口，方便已有代码迁移。
    pub fn content(&self) -> String {
        self.message_content().text_content()
    }

    /// 懒解析为标准 ContentBlock 列表
    ///
    /// 对齐 LangChain JS 的 `message.contentBlocks` 属性。
    pub fn content_blocks(&self) -> Vec<ContentBlock> {
        self.message_content().content_blocks()
    }

    /// 是否包含工具调用
    pub fn has_tool_calls(&self) -> bool {
        match self {
            Self::Ai { tool_calls, .. } => !tool_calls.is_empty(),
            _ => false,
        }
    }

    /// 获取工具调用列表（仅 Ai 变体有效）
    pub fn tool_calls(&self) -> &[ToolCallRequest] {
        match self {
            Self::Ai { tool_calls, .. } => tool_calls,
            _ => &[],
        }
    }

    /// 是否为系统消息
    pub fn is_system(&self) -> bool {
        matches!(self, Self::System { .. })
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_content_block_text() {
        let b = ContentBlock::text("hello");
        assert_eq!(b.as_text(), Some("hello"));
    }

    #[test]
    fn test_message_content_text_content() {
        let mc = MessageContent::Blocks(vec![
            ContentBlock::reasoning("let me think..."),
            ContentBlock::text("final answer"),
        ]);
        assert_eq!(mc.text_content(), "final answer");
    }

    #[test]
    fn test_content_blocks_from_string() {
        let mc = MessageContent::text("hello");
        let blocks = mc.content_blocks();
        assert_eq!(blocks.len(), 1);
        assert_eq!(blocks[0].as_text(), Some("hello"));
    }

    #[test]
    fn test_ai_from_blocks_extracts_tool_calls() {
        let blocks = vec![
            ContentBlock::text("I'll use a tool"),
            ContentBlock::tool_use("id1", "bash", serde_json::json!({"command": "ls"})),
        ];
        let msg = BaseMessage::ai_from_blocks(blocks);
        assert!(msg.has_tool_calls());
        assert_eq!(msg.tool_calls().len(), 1);
        assert_eq!(msg.tool_calls()[0].name, "bash");
    }

    #[test]
    fn test_base_message_content_blocks_lazy_parse() {
        let msg = BaseMessage::ai(MessageContent::Blocks(vec![
            ContentBlock::reasoning("thinking..."),
            ContentBlock::text("answer"),
        ]));
        let blocks = msg.content_blocks();
        assert_eq!(blocks.len(), 2);
        assert!(matches!(blocks[0], ContentBlock::Reasoning { .. }));
        assert_eq!(blocks[1].as_text(), Some("answer"));
    }

    #[test]
    fn test_human_message_multimodal() {
        let msg = BaseMessage::human(MessageContent::Blocks(vec![
            ContentBlock::text("What's in this image?"),
            ContentBlock::image_url("https://example.com/image.jpg"),
        ]));
        let blocks = msg.content_blocks();
        assert_eq!(blocks.len(), 2);
        assert!(matches!(blocks[1], ContentBlock::Image { .. }));
    }

    #[test]
    fn test_message_content_serde_roundtrip() {
        let mc = MessageContent::Blocks(vec![
            ContentBlock::text("hello"),
            ContentBlock::reasoning_with_signature("think", "sig123"),
        ]);
        let json = serde_json::to_string(&mc).unwrap();
        let mc2: MessageContent = serde_json::from_str(&json).unwrap();
        assert_eq!(mc, mc2);
    }
}

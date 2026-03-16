use langchain_rust::llm::openai::{OpenAI, OpenAIConfig};

/// 构建 langchain-rust OpenAI LLM 实例
pub fn build_openai_llm(api_key: &str, api_base: Option<&str>) -> OpenAI<OpenAIConfig> {
    let mut config = OpenAIConfig::default().with_api_key(api_key);
    if let Some(base) = api_base {
        config = config.with_api_base(base);
    }
    OpenAI::new(config).with_model("glm-4.7")
}

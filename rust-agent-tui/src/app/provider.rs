use rust_create_agent::llm::{BaseModel, ChatAnthropic, ChatOpenAI};

#[derive(Clone)]
pub enum LlmProvider {
    OpenAi {
        api_key: String,
        base_url: String,
        model: String,
    },
    Anthropic {
        api_key: String,
        model: String,
    },
}

impl LlmProvider {
    pub fn from_env() -> Option<Self> {
        let provider_hint = std::env::var("MODEL_PROVIDER").unwrap_or_default();

        match provider_hint.to_lowercase().as_str() {
            "anthropic" => {
                let api_key = std::env::var("ANTHROPIC_API_KEY").ok()?;
                let model = std::env::var("ANTHROPIC_MODEL")
                    .unwrap_or_else(|_| "claude-sonnet-4-6".to_string());
                Some(Self::Anthropic { api_key, model })
            }
            "openai" | "" => {
                if provider_hint.is_empty() {
                    if let Ok(api_key) = std::env::var("ANTHROPIC_API_KEY") {
                        let model = std::env::var("ANTHROPIC_MODEL")
                            .unwrap_or_else(|_| "claude-sonnet-4-6".to_string());
                        return Some(Self::Anthropic { api_key, model });
                    }
                }
                let api_key = std::env::var("OPENAI_API_KEY").ok()?;
                let base_url = std::env::var("OPENAI_API_BASE")
                    .or_else(|_| std::env::var("OPENAI_BASE_URL"))
                    .unwrap_or_else(|_| "https://api.openai.com/v1".to_string());
                let model = std::env::var("OPENAI_MODEL")
                    .unwrap_or_else(|_| "gpt-4o".to_string());
                Some(Self::OpenAi { api_key, base_url, model })
            }
            _ => {
                let api_key = std::env::var("OPENAI_API_KEY").ok()?;
                let base_url = std::env::var("OPENAI_API_BASE")
                    .or_else(|_| std::env::var("OPENAI_BASE_URL"))
                    .unwrap_or_else(|_| "https://api.openai.com/v1".to_string());
                let model = std::env::var("OPENAI_MODEL")
                    .unwrap_or_else(|_| "gpt-4o".to_string());
                Some(Self::OpenAi { api_key, base_url, model })
            }
        }
    }

    pub fn display_name(&self) -> &str {
        match self {
            Self::OpenAi { .. } => "OpenAI",
            Self::Anthropic { .. } => "Anthropic",
        }
    }

    pub fn model_name(&self) -> &str {
        match self {
            Self::OpenAi { model, .. } => model,
            Self::Anthropic { model, .. } => model,
        }
    }

    pub fn into_model(self) -> Box<dyn BaseModel> {
        match self {
            Self::OpenAi { api_key, base_url, model } => {
                Box::new(ChatOpenAI::new(api_key, model).with_base_url(base_url))
            }
            Self::Anthropic { api_key, model } => {
                Box::new(ChatAnthropic::new(api_key, model))
            }
        }
    }
}

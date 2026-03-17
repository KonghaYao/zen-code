pub mod adapter;
pub mod anthropic;
pub mod openai;
pub mod react_adapter;
pub mod types;

use async_trait::async_trait;
use crate::error::AgentResult;
use crate::llm::types::{LlmRequest, LlmResponse};

/// BaseModel trait - 统一 LLM 接口，对齐 LangChain Python BaseModel
#[async_trait]
pub trait BaseModel: Send + Sync {
    async fn invoke(&self, request: LlmRequest) -> AgentResult<LlmResponse>;
    fn provider_name(&self) -> &str;
    fn model_id(&self) -> &str;
}

pub use adapter::MockLLM;
pub use anthropic::ChatAnthropic;
pub use openai::ChatOpenAI;
pub use react_adapter::BaseModelReactLLM;

use crate::agent::react::{AgentInput, AgentOutput, ReactLLM, ToolCall, ToolResult};
use crate::agent::state::State;
use crate::error::{AgentError, AgentResult};
use crate::messages::{BaseMessage, ToolCallRequest};
use crate::middleware::chain::MiddlewareChain;
use crate::middleware::r#trait::Middleware;
use crate::tools::BaseTool;
use std::collections::HashMap;

/// Agent 执行器 - 管理 ReAct 循环
pub struct AgentExecutor<L, S>
where
    L: ReactLLM,
    S: State,
{
    llm: L,
    tools: HashMap<String, Box<dyn BaseTool>>,
    chain: MiddlewareChain<S>,
    max_iterations: usize,
}

impl<L: ReactLLM, S: State> AgentExecutor<L, S> {
    pub fn new(llm: L) -> Self {
        Self {
            llm,
            tools: HashMap::new(),
            chain: MiddlewareChain::new(),
            max_iterations: 10,
        }
    }

    pub fn max_iterations(mut self, n: usize) -> Self {
        self.max_iterations = n;
        self
    }

    pub fn register_tool(mut self, tool: Box<dyn BaseTool>) -> Self {
        self.tools.insert(tool.name().to_string(), tool);
        self
    }

    pub fn add_middleware(mut self, middleware: Box<dyn Middleware<S>>) -> Self {
        self.chain.add(middleware);
        self
    }

    pub fn middleware_names(&self) -> Vec<&str> {
        self.chain.names()
    }

    pub fn tool_names(&self) -> Vec<String> {
        self.tools.keys().cloned().collect()
    }

    /// 执行 Agent（ReAct 循环主入口）
    pub async fn execute(&self, input: AgentInput, state: &mut S) -> AgentResult<AgentOutput> {
        // 支持 AgentInput 携带 MessageContent（多模态输入）
        let human_msg = BaseMessage::human(input.content);
        state.add_message(human_msg);

        let tool_refs: Vec<&dyn BaseTool> = self.tools.values().map(|t| t.as_ref()).collect();

        self.chain.run_before_agent(state).await?;

        let mut all_tool_calls: Vec<(ToolCall, ToolResult)> = Vec::new();

        for step in 0..self.max_iterations {
            state.set_current_step(step);

            let reasoning = match self
                .llm
                .generate_reasoning(state.messages(), &tool_refs)
                .await
            {
                Ok(r) => r,
                Err(e) => {
                    self.chain.run_on_error(state, &e).await?;
                    return Err(e);
                }
            };

            if reasoning.needs_tool_call() {
                // AI 消息（含 tool_calls）加入消息历史
                {
                    let tc_reqs: Vec<ToolCallRequest> = reasoning
                        .tool_calls
                        .iter()
                        .map(|tc| {
                            ToolCallRequest::new(tc.id.clone(), tc.name.clone(), tc.input.clone())
                        })
                        .collect();
                    let ai_msg =
                        BaseMessage::ai_with_tool_calls(reasoning.thought.clone(), tc_reqs);
                    state.add_message(ai_msg);
                }

                for tool_call in reasoning.tool_calls {
                    let modified_call = match self
                        .chain
                        .run_before_tool(state, tool_call.clone())
                        .await
                    {
                        Ok(c) => c,
                        Err(e) => {
                            self.chain.run_on_error(state, &e).await?;
                            return Err(e);
                        }
                    };

                    let tool_result = self.call_tool(&modified_call).await;

                    let result = match tool_result {
                        Ok(output) => {
                            ToolResult::success(&modified_call.id, &modified_call.name, output)
                        }
                        Err(AgentError::ToolNotFound(ref name)) => {
                            let e = AgentError::ToolNotFound(name.clone());
                            self.chain.run_on_error(state, &e).await?;
                            return Err(e);
                        }
                        Err(ref e) => {
                            self.chain.run_on_error(state, e).await?;
                            ToolResult::error(
                                &modified_call.id,
                                &modified_call.name,
                                e.to_string(),
                            )
                        }
                    };

                    if let Err(e) = self
                        .chain
                        .run_after_tool(state, &modified_call, &result)
                        .await
                    {
                        self.chain.run_on_error(state, &e).await?;
                        return Err(e);
                    }

                    let tool_msg = if result.is_error {
                        BaseMessage::tool_error(&result.tool_call_id, result.output.as_str())
                    } else {
                        BaseMessage::tool_result(&result.tool_call_id, result.output.as_str())
                    };
                    state.add_message(tool_msg);

                    all_tool_calls.push((modified_call, result));
                }
            } else {
                let answer = reasoning
                    .final_answer
                    .unwrap_or_else(|| reasoning.thought.clone());

                state.add_message(BaseMessage::ai(answer.as_str()));

                let output = AgentOutput {
                    text: answer,
                    steps: step + 1,
                    tool_calls: all_tool_calls,
                };

                return match self.chain.run_after_agent(state, output).await {
                    Ok(o) => Ok(o),
                    Err(e) => {
                        self.chain.run_on_error(state, &e).await?;
                        Err(e)
                    }
                };
            }
        }

        Err(AgentError::MaxIterationsExceeded(self.max_iterations))
    }

    async fn call_tool(&self, tool_call: &ToolCall) -> AgentResult<String> {
        let tool = self
            .tools
            .get(&tool_call.name)
            .ok_or_else(|| AgentError::ToolNotFound(tool_call.name.clone()))?;

        tool.invoke(tool_call.input.clone())
            .await
            .map_err(|e| AgentError::ToolExecutionFailed {
                tool: tool_call.name.clone(),
                reason: e.to_string(),
            })
    }
}

/// Builder
pub struct AgentExecutorBuilder<L, S>
where
    L: ReactLLM,
    S: State,
{
    executor: AgentExecutor<L, S>,
}

impl<L: ReactLLM, S: State> AgentExecutorBuilder<L, S> {
    pub fn new(llm: L) -> Self {
        Self {
            executor: AgentExecutor::new(llm),
        }
    }

    pub fn max_iterations(mut self, n: usize) -> Self {
        self.executor = self.executor.max_iterations(n);
        self
    }

    pub fn tool(mut self, tool: Box<dyn BaseTool>) -> Self {
        self.executor = self.executor.register_tool(tool);
        self
    }

    pub fn middleware(mut self, mw: Box<dyn Middleware<S>>) -> Self {
        self.executor = self.executor.add_middleware(mw);
        self
    }

    pub fn build(self) -> AgentExecutor<L, S> {
        self.executor
    }
}

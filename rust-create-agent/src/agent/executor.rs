use langchain_rust::schemas::Message as LCMessage;
use langchain_rust::tools::Tool;

use crate::agent::react::{AgentInput, AgentOutput, ReactLLM, ToolCall, ToolResult};
use crate::agent::state::State;
use crate::error::{AgentError, AgentResult};
use crate::middleware::chain::MiddlewareChain;
use crate::middleware::r#trait::Middleware;
use std::collections::HashMap;

/// Agent 执行器 - 管理 ReAct 循环
/// 与 TypeScript AgentPackage 职责对应
///
/// 使用 langchain-rust 的 Tool trait 作为工具接口
pub struct AgentExecutor<L, S>
where
    L: ReactLLM,
    S: State,
{
    /// ReAct LLM（包装 langchain-rust LLM）
    llm: L,
    /// 已注册工具（名称 -> langchain-rust Tool）
    tools: HashMap<String, Box<dyn Tool>>,
    /// 中间件链
    chain: MiddlewareChain<S>,
    /// 最大 ReAct 迭代次数
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

    /// 注册 langchain-rust Tool
    pub fn register_tool(mut self, tool: Box<dyn Tool>) -> Self {
        self.tools.insert(tool.name(), tool);
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
        // 将用户输入加入消息历史（langchain-rust HumanMessage）
        state.add_message(LCMessage::new_human_message(&input.text));

        // 收集 langchain-rust Tool 引用（传给 ReactLLM）
        let tool_refs: Vec<&dyn Tool> = self.tools.values().map(|t| t.as_ref()).collect();

        // 1. before_agent 中间件
        self.chain.run_before_agent(state).await?;

        let mut all_tool_calls: Vec<(ToolCall, ToolResult)> = Vec::new();

        // 2. ReAct 循环
        for step in 0..self.max_iterations {
            state.set_current_step(step);

            // 生成推理（传入 langchain-rust 标准消息 + 工具列表）
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
                // 将 AI 推理过程加入消息历史
                if !reasoning.thought.is_empty() {
                    state.add_message(LCMessage::new_ai_message(&reasoning.thought));
                }

                for tool_call in reasoning.tool_calls {
                    // before_tool 中间件
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

                    // 执行 langchain-rust Tool
                    let tool_result = self.call_tool(&modified_call).await;

                    let result = match tool_result {
                        Ok(output) => ToolResult::success(
                            &modified_call.id,
                            &modified_call.name,
                            output,
                        ),
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

                    // after_tool 中间件
                    if let Err(e) = self
                        .chain
                        .run_after_tool(state, &modified_call, &result)
                        .await
                    {
                        self.chain.run_on_error(state, &e).await?;
                        return Err(e);
                    }

                    // 工具结果加入消息历史（HumanMessage 模拟 tool result）
                    state.add_message(LCMessage::new_human_message(format!(
                        "[Tool result: {}] {}",
                        result.tool_name, result.output
                    )));

                    all_tool_calls.push((modified_call, result));
                }
            } else {
                // 生成最终答案
                let answer = reasoning
                    .final_answer
                    .unwrap_or_else(|| reasoning.thought.clone());

                state.add_message(LCMessage::new_ai_message(&answer));

                let output = AgentOutput {
                    text: answer,
                    steps: step + 1,
                    tool_calls: all_tool_calls,
                };

                // after_agent 中间件
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

    /// 调用 langchain-rust Tool
    async fn call_tool(&self, tool_call: &ToolCall) -> AgentResult<String> {
        let tool = self
            .tools
            .get(&tool_call.name)
            .ok_or_else(|| AgentError::ToolNotFound(tool_call.name.clone()))?;

        // langchain-rust Tool::run 接受 serde_json::Value
        tool.run(tool_call.input.clone())
            .await
            .map_err(|e| AgentError::ToolExecutionFailed {
                tool: tool_call.name.clone(),
                reason: e.to_string(),
            })
    }
}

/// Builder - 便捷构建 AgentExecutor
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

    pub fn tool(mut self, tool: Box<dyn Tool>) -> Self {
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

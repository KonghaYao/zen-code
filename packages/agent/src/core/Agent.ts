import { StateGraph } from '@langchain/langgraph';
import type { ConfigManager } from '@codegraph/config';
import type { AgentOptions, AgentState, AgentInvokeOptions } from './types.js';

/**
 * Agent 核心类
 */
export class Agent {
  private configManager: ConfigManager;
  private graph: StateGraph;
  private middlewares: any[];
  private recursionLimit: number;

  constructor(options: AgentOptions) {
    this.configManager = options.configManager;
    this.middlewares = options.middlewares || [];
    this.recursionLimit = options.recursionLimit || 200;
    this.graph = this.buildGraph();
  }

  /**
   * 构建 LangGraph
   * 使用迁移后的 graphBuilder
   */
  private buildGraph(): StateGraph {
    // 导入迁移后的 graph builder
    const { createCodeGraph } = require('../graphBuilder.js');
    return createCodeGraph();
  }

  /**
   * 获取配置
   */
  async getConfig(): Promise<any> {
    return await this.configManager.getConfig();
  }

  /**
   * 执行 Agent
   */
  async invoke(
    input: Partial<AgentState>,
    options?: AgentInvokeOptions
  ): Promise<any> {
    const config = await this.getConfig();

    const initialState = {
      ...input,
      main_model: config.main_model,
      enable_thinking: config.enable_thinking,
    };

    return await this.graph.invoke(initialState, {
      recursionLimit: options?.recursionLimit || this.recursionLimit,
    });
  }

  /**
   * 流式执行 Agent
   */
  async *stream(
    input: Partial<AgentState>,
    options?: AgentInvokeOptions
  ): AsyncGenerator<any, void, unknown> {
    const config = await this.getConfig();

    const initialState = {
      ...input,
      main_model: config.main_model,
      enable_thinking: config.enable_thinking,
    };

    yield* this.graph.stream(initialState, {
      recursionLimit: options?.recursionLimit || this.recursionLimit,
    });
  }

  /**
   * 获取 graph 实例（用于向后兼容）
   */
  getGraph(): StateGraph {
    return this.graph;
  }
}

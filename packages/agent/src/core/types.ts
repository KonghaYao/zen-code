import type { AppConfig } from '@codegraph/config';

/**
 * Agent 中间件接口
 */
export interface AgentMiddleware {
  /**
   * 包装模型调用
   */
  wrapModelCall?(
    req: any,
    handler: (req: any) => Promise<any>
  ): Promise<any>;

  /**
   * 包装工具调用
   */
  wrapToolCall?(
    toolName: string,
    args: any,
    handler: (toolName: string, args: any) => Promise<any>
  ): Promise<any>;
}

/**
 * Agent 选项
 */
export interface AgentOptions {
  configManager: any; // ConfigManager from @codegraph/config
  middlewares?: AgentMiddleware[];
  recursionLimit?: number;
}

/**
 * Agent 执行选项
 */
export interface AgentInvokeOptions {
  recursionLimit?: number;
  stream?: boolean;
}

/**
 * Agent 状态
 */
export interface AgentState {
  messages: any[];
  main_model?: string;
  enable_thinking?: boolean;
  switch_command?: string;
  task_store?: any;
}

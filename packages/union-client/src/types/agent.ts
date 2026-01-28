/**
 * Agent 相关类型定义
 */

/**
 * 工具调用参数类型
 */
export type ToolArgs = Record<string, unknown>;

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  thinking?: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  args: ToolArgs;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
}

export interface AgentState {
  messages: AgentMessage[];
  tools: ToolCall[];
  config: any;
  isLoading: boolean;
  error?: Error;
}

export interface UseAgentOptions {
  serverUrl?: string;
  graphId?: string;
  recursionLimit?: number;
}

export interface UseAgentReturn {
  // 消息相关
  messages: AgentMessage[];
  sendMessage: (message: string) => Promise<void>;

  // 状态
  isLoading: boolean;
  error?: Error;

  // 工具调用
  tools: ToolCall[];

  // 配置
  config?: any;
  updateConfig?: (updates: any) => Promise<void>;

  // 生命周期
  reset: () => void;
}

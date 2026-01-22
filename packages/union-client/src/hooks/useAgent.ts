/**
 * useAgent Hook
 * 通用的 Agent 连接 Hook，支持 TUI 和 Web UI
 */

import { useCallback, useState } from 'react';
import type {
  UseAgentOptions,
  UseAgentReturn,
  AgentMessage,
  ToolCall,
} from '../types/agent.js';

export function useAgent(options: UseAgentOptions = {}): UseAgentReturn {
  const {
    serverUrl = 'http://localhost:8123',
    graphId = 'code',
    recursionLimit = 200,
  } = options;

  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [tools, setTools] = useState<ToolCall[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>();
  const [config, setConfig] = useState<any>();

  /**
   * 发送消息
   */
  const sendMessage = useCallback(
    async (message: string) => {
      setIsLoading(true);
      setError(undefined);

      try {
        // TODO: 实际的 API 调用
        // 这里需要根据 LangGraph SDK 的实际 API 进行实现
        const response = await fetch(`${serverUrl}/invoke`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            graphId,
            input: { messages: [{ role: 'user', content: message }] },
            config: { recursionLimit },
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        // 更新消息列表
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'user',
            content: message,
            timestamp: Date.now(),
          },
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: result.output || '',
            timestamp: Date.now(),
          },
        ]);

        // 更新工具调用
        if (result.toolCalls) {
          setTools(result.toolCalls);
        }
      } catch (err) {
        setError(err as Error);
        console.error('Error sending message:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [serverUrl, graphId, recursionLimit]
  );

  /**
   * 重置对话
   */
  const reset = useCallback(() => {
    setMessages([]);
    setTools([]);
    setError(undefined);
    setIsLoading(false);
  }, []);

  /**
   * 更新配置
   */
  const updateConfig = useCallback(async (updates: any) => {
    try {
      const response = await fetch(`${serverUrl}/config`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const newConfig = await response.json();
      setConfig(newConfig);
      return newConfig;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [serverUrl]);

  return {
    messages,
    sendMessage,
    isLoading,
    error,
    tools,
    config,
    updateConfig,
    reset,
  };
}

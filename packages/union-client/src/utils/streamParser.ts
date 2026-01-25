/**
 * 流式响应解析工具
 */

export interface StreamChunk {
  type: 'content' | 'tool' | 'thinking' | 'metadata';
  data: any;
}

/**
 * 解析流式响应块
 */
export function parseStreamChunk(chunk: any): StreamChunk | null {
  if (!chunk) return null;

  // 内容块
  if (chunk.content) {
    return {
      type: 'content',
      data: chunk.content,
    };
  }

  // 工具调用
  if (chunk.tool_calls) {
    return {
      type: 'tool',
      data: chunk.tool_calls,
    };
  }

  // 思考内容
  if (chunk.thinking) {
    return {
      type: 'thinking',
      data: chunk.thinking,
    };
  }

  // 元数据
  if (chunk.metadata) {
    return {
      type: 'metadata',
      data: chunk.metadata,
    };
  }

  return null;
}

/**
 * 聚合流式响应
 */
export function aggregateStreamChunks(chunks: StreamChunk[]): {
  content: string;
  tools: any[];
  thinking: string;
  metadata: Record<string, any>;
} {
  const result = {
    content: '',
    tools: [] as any[],
    thinking: '',
    metadata: {} as Record<string, any>,
  };

  for (const chunk of chunks) {
    switch (chunk.type) {
      case 'content':
        result.content += chunk.data;
        break;
      case 'tool':
        result.tools.push(...chunk.data);
        break;
      case 'thinking':
        result.thinking += chunk.data;
        break;
      case 'metadata':
        result.metadata = { ...result.metadata, ...chunk.data };
        break;
    }
  }

  return result;
}

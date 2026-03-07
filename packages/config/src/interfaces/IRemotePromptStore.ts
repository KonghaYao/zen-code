/**
 * 远程 Prompt 仓库抽象接口
 */

export interface RemotePromptItem {
    id: string;
    name: string;
    description?: string;
    content: string;
    tags?: string[];
    author?: string;
    source_url?: string;
    metadata?: Record<string, any>;
}

export interface IRemotePromptStore {
    /**
     * 列出远程可用的 prompts
     */
    listRemotePrompts(options?: { page?: number; limit?: number }): Promise<RemotePromptItem[]>;

    /**
     * 按关键词搜索 prompts
     */
    searchRemotePrompts(query: string): Promise<RemotePromptItem[]>;

    /**
     * 获取单个 prompt 的完整内容
     */
    fetchRemotePrompt(id: string): Promise<RemotePromptItem | null>;
}

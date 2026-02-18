/**
 * Agent 包测试全局设置
 * Mock LangGraph 和相关依赖
 */

import { vi } from 'vitest';

// Mock @langchain/core
vi.mock('@langchain/core', () => ({
    AgentState: {
        extend: vi.fn((schema: any) => schema),
    },
    MessagesAnnotation: {},
}));

// Mock @langchain/langgraph
vi.mock('@langchain/langgraph', () => ({
    StateGraph: vi.fn().mockImplementation(() => ({
        addNode: vi.fn().mockReturnThis(),
        addEdge: vi.fn().mockReturnThis(),
        setEntryPoint: vi.fn().mockReturnThis(),
        compile: vi.fn().mockReturnValue({
            invoke: vi.fn().mockResolvedValue({
                messages: [],
                task_store: {},
            }),
        }),
    })),
    START: 'start',
    REMOVE_ALL_MESSAGES: 'remove_all',
}));

// Mock @langgraph-js/pro
vi.mock('@langgraph-js/pro', () => ({
    createState: vi.fn(() => ({
        build: vi.fn((...args: any[]) => ({
            State: {},
            ...args,
        })),
    })),
    createDefaultAnnotation: vi.fn((fn: any) => fn),
}));

// Mock AIMessage and RemoveMessage
vi.mock('@langchain/core/messages', () => ({
    AIMessage: vi.fn().mockImplementation((content: string) => ({
        content,
        type: 'ai',
    })),
    RemoveMessage: vi.fn().mockImplementation((opts: { id: string }) => ({
        id: opts.id,
        type: 'remove',
    })),
}));

// Mock initChatModel
vi.mock('../utils/initChatModel', () => ({
    initChatModel: vi.fn().mockResolvedValue({
        invoke: vi.fn().mockResolvedValue({
            content: 'Mocked response',
        }),
    }),
}));

// Mock analyzeAndSaveMemories
vi.mock('../memories/analyze', () => ({
    analyzeAndSaveMemories: vi.fn().mockResolvedValue('Summary of conversation'),
}));

// Mock subagents config - getDefaultAgentId is still used
vi.mock('../subagents/config', () => ({
    getDefaultAgentId: vi.fn().mockReturnValue('default'),
    validateAgentConfig: vi.fn().mockReturnValue([]),
}));

// Mock subagents factory
vi.mock('../subagents/factory', () => ({
    createStandardAgent: vi.fn().mockResolvedValue({
        invoke: vi.fn().mockResolvedValue({
            messages: [],
            task_store: {},
        }),
    }),
}));

// Mock file system operations
vi.mock('fs', async () => {
    const actual = await vi.importActual<typeof import('fs')>('fs');
    return { ...actual };
});

// Mock path
vi.mock('path', async () => {
    const actual = await vi.importActual<typeof import('path')>('path');
    return { ...actual };
});

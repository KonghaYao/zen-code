# Subagents 设计文档

## 1. 概述

### 1.1 目标

设计一个基于 LangGraph `switchBranch` 的 subagents 系统，允许：

- 后端通过分支选择不同的 agent 执行路径
- 前端通过参数控制使用的 agent
- 与现有的 SubAgentsMiddleware 插件系统独立运行

### 1.2 与现有系统的区别

| 维度       | 现有 SubAgentsMiddleware       | 新 SwitchBranch Subagents |
| ---------- | ------------------------------ | ------------------------- |
| 实现方式   | Tool 调用 + Middleware 注入    | LangGraph switchBranch    |
| 触发机制   | AI 决定调用 ask_subagents tool | 前端参数控制 + 状态驱动   |
| 状态管理   | task_store 存储子任务状态      | 共享主状态，分支执行      |
| 使用场景   | AI 自主委托专门任务            | 用户明确切换 agent 模式   |
| 上下文隔离 | 完全隔离的子状态               | 共享历史记录              |

### 1.3 设计原则

- **状态驱动**：通过 `switch_command` 字段控制分支选择
- **参数化配置**：前端可传入 agent 类型和参数
- **最小侵入**：复用现有状态和工具系统
- **类型安全**：TypeScript 严格模式，明确 agent 配置 schema

---

## 2. 状态设计

使用现有的 `switch_command` 字段控制 agent 切换，无需修改 state schema。

可用的 switch_command 值：

- `summarization` - 现有：对话总结
- `smart_memory` - 现有：智能记忆
- `default` - 默认：完整能力 Code Agent（使用 `prompts/coding.ts` 提示词）
- `finder` - 文件搜索 agent（只读工具）
- `planner` - 任务规划 agent
- `reviewer` - 代码审查 agent

---

## 3. 后端实现

### 3.1 Agent 配置定义

```typescript
// agents/code/subagents/config.ts

export interface AgentConfig {
    id: string;
    name: string;
    description: string;
    systemPrompt: string | ((state: any) => Promise<string> | string);
    tools: string[];
    middleware: {
        agents_md?: boolean;
        skills?: boolean;
        memories?: boolean;
        mcp?: boolean;
        subagents?: boolean;
        cache?: boolean;
    };
}

// Agent 配置加载函数
export async function loadAgentsList(): Promise<Record<string, AgentConfig>> {
    const { getSystemPrompt } = await import('../prompts/coding.js');

    return {
        default: {
            id: 'default',
            name: 'Code Agent',
            description: '全功能代码助手',
            systemPrompt: getSystemPrompt, // 使用 prompts/coding.ts 的完整提示词
            tools: ['all'],
            middleware: {
                agents_md: true,
                skills: true,
                memories: true,
                mcp: true,
                subagents: true,
                cache: process.env.MODEL_PROVIDER === 'anthropic',
            },
        },
        finder: {
            id: 'finder',
            name: 'Finder Agent',
            description: '文件搜索专家，只读工具',
            systemPrompt: '你是文件搜索专家，专注于文件查找和只读分析。',
            tools: ['glob_files', 'search_files_rg', 'read_file'],
            middleware: {
                agents_md: true,
                skills: true,
                memories: true,
                mcp: false,
                subagents: false,
                cache: false,
            },
        },
        planner: {
            id: 'planner',
            name: 'Planner Agent',
            description: '任务规划专家',
            systemPrompt: '你是任务规划专家，专注于理解目标、拆解步骤、创建待办清单。不执行代码修改。',
            tools: ['todo_write', 'ask_user_with_options'],
            middleware: {
                agents_md: true,
                skills: false,
                memories: false,
                mcp: false,
                subagents: false,
                cache: false,
            },
        },
        reviewer: {
            id: 'reviewer',
            name: 'Reviewer Agent',
            description: '代码审查专家，只读分析',
            systemPrompt: '你是代码审查专家，关注代码质量、规范、潜在 bug、性能优化建议。不直接修改代码。',
            tools: ['glob_files', 'search_files_rg', 'read_file'],
            middleware: {
                agents_md: true,
                skills: true,
                memories: true,
                mcp: false,
                subagents: false,
                cache: false,
            },
        },
    };
}

// 获取默认 agent ID
export function getDefaultAgentId(): string {
    return 'default';
}
```

**关键设计决策**：

- **默认 agent 在配置中**：所有 agents（包括 default）统一在 `loadAgentsList()` 定义
- **动态提示词支持**：`systemPrompt` 可以是函数（如 `getSystemPrompt(state)`）
- **代码直接引用**：通过 `import` 直接加载 `prompts/coding.ts`，避免动态文件路径

### 3.2 标准 Agent 工厂

```typescript
// agents/code/subagents/factory.ts

import { initChatModel } from '../initChatModel.js';
import { createAgent, Runtime } from 'langchain';
import { CodeState, CodeStateType } from '../state.js';
import {
    AgentsMdMiddleware,
    SkillsMiddleware,
    MemoriesMiddleware,
    MCPMiddleware,
    humanInTheLoopMiddleware,
    anthropicPromptCachingMiddleware,
    SubAgentsMiddleware,
} from '../middlewares/index.js';
import { bash_tools } from '../tools/bash_tools/index.js';
import {
    ask_user_with_options,
    todo_write_tool,
    glob_tool,
    grep_tool,
    read_tool,
    write_tool,
    replace_tool,
} from '../tools/index.js';
import { create_finder } from '../subagents/finder.js';
import { getSystemPrompt } from '../prompts/coding.js';
import type { AgentConfig } from './config.js';

// 所有可用工具
const ALL_TOOLS = [
    ask_user_with_options,
    todo_write_tool,
    glob_tool,
    grep_tool,
    read_tool,
    write_tool,
    replace_tool,
    ...bash_tools,
];

// 工具映射
const TOOL_MAP = new Map(ALL_TOOLS.map((t) => [t.name, t]));

/**
 * 创建标准 Agent，支持配置项开关
 */
export async function createStandardAgent(config: AgentConfig, state: CodeStateType, runtime: Runtime) {
    const model = await initChatModel(state.main_model, {
        modelProvider: process.env.MODEL_PROVIDER || 'openai',
        streamUsage: true,
        enableThinking: state.enable_thinking ?? true,
    });

    // 根据配置筛选工具
    const tools = config.tools.includes('all')
        ? ALL_TOOLS
        : config.tools.map((name) => TOOL_MAP.get(name)).filter(Boolean);

    // 构建中间件链
    const middleware = [];

    if (config.middleware.subagents) {
        const subagents = new SubAgentsMiddleware();
        subagents.addSubAgents('finder', create_finder);
        middleware.push(subagents);
    }

    if (config.middleware.agents_md) {
        middleware.push(new AgentsMdMiddleware());
    }

    if (config.middleware.skills) {
        middleware.push(
            new SkillsMiddleware({
                projectSkillsDir: './.claude/skills',
            }),
        );
    }

    if (config.middleware.memories) {
        middleware.push(
            new MemoriesMiddleware({
                projectMemoriesDir: './.claude/memories',
            }),
        );
    }

    if (config.middleware.mcp) {
        middleware.push(await MCPMiddleware(state.mcp_config as any));
    }

    // HITL 默认启用
    middleware.push(
        humanInTheLoopMiddleware({
            interruptOn: {
                terminal: { allowedDecisions: ['approve', 'reject', 'edit'] },
            },
        }),
    );

    if (config.middleware.cache && process.env.MODEL_PROVIDER === 'anthropic') {
        middleware.push(anthropicPromptCachingMiddleware());
    }

    // 解析 system prompt（支持字符串和函数）
    const systemPrompt =
        typeof config.systemPrompt === 'function' ? await config.systemPrompt(state) : config.systemPrompt;

    return createAgent({
        name: config.name,
        model,
        systemPrompt,
        tools,
        stateSchema: CodeState,
        middleware,
    });
}

/**
 * 获取所有可用工具名称（用于配置验证）
 */
export function getAvailableToolNames(): Set<string> {
    return new Set(TOOL_MAP.keys());
}
```

**关键实现细节**：

- **工具白名单**：通过 `tools` 数组控制 agent 可用工具
- **中间件开关**：每个中间件独立配置，按需启用
- **Prompt 函数支持**：判断 `systemPrompt` 类型，函数则调用并传入 `state`

### 3.3 Graph 节点实现

```typescript
// agents/code/graph.ts

import { Runtime, HumanMessage, SystemMessage } from 'langchain';
import { CodeAnnotation as CodeState, CodeStateType } from './state.js';
import { getBufferMessage } from './utils/get_buffer_message.js';
import { REMOVE_ALL_MESSAGES, START, StateGraph } from '@langchain/langgraph';
import { AIMessage, RemoveMessage } from '@langchain/core/messages';
import { initChatModel } from './initChatModel.js';
import { analyzeAndSaveMemories } from './memories/analyze.js';
import { loadAgentsList, getDefaultAgentId, type AgentConfig } from './subagents/config.js';
import { createStandardAgent } from './subagents/factory.js';

// 缓存 agent 配置
let agentConfigs: Record<string, AgentConfig> | null = null;

// 特殊分支处理
const switchBranch = {
    summarization: async (state: CodeStateType) => {
        const model = await initChatModel(state.main_model, {
            modelProvider: process.env.MODEL_PROVIDER || 'openai',
            streamUsage: true,
            enableThinking: state.enable_thinking ?? true,
        });
        const summaryPrompt = (await import('./middlewares/memory.js')).summary_prompt;
        const message = await model.invoke([
            new SystemMessage(summaryPrompt),
            new HumanMessage(getBufferMessage(state.messages)),
            new HumanMessage('请总结上面的历史记录'),
        ]);
        return {
            switch_command: '',
            messages: [new RemoveMessage({ id: REMOVE_ALL_MESSAGES }), message],
        };
    },
    smart_memory: async (state: CodeStateType) => {
        const model = await initChatModel(state.main_model, {
            modelProvider: process.env.MODEL_PROVIDER || 'openai',
            streamUsage: true,
            enableThinking: state.enable_thinking ?? true,
        });
        const summaryContent = await analyzeAndSaveMemories(model, getBufferMessage(state.messages));
        return {
            switch_command: '',
            messages: [new RemoveMessage({ id: REMOVE_ALL_MESSAGES }), new AIMessage(summaryContent)],
        };
    },
} as const;

// 调用 agent 的通用函数
async function invokeAgent(config: AgentConfig, state: CodeStateType, runtime: Runtime) {
    const agent = await createStandardAgent(config, state, runtime);
    const response = await agent.invoke(state, { recursionLimit: 200 });
    return {
        switch_command: '',
        task_store: response.task_store,
        messages: response.messages,
    };
}

// 主节点
export const graph = new StateGraph(CodeState)
    .addNode('graph', async (state: CodeStateType, runtime: Runtime) => {
        const { switch_command: cmd } = state;

        // 优先处理特殊分支
        if (cmd === 'summarization') return switchBranch.summarization(state);
        if (cmd === 'smart_memory') return switchBranch.smart_memory(state);

        // 加载 agent 配置（带缓存）
        const configs = agentConfigs || (await loadAgentsList());
        agentConfigs ??= configs;

        // 确定使用的 agent ID
        const agentId = cmd || getDefaultAgentId();
        const config = configs[agentId];

        if (!config) {
            throw new Error(`Unknown agent: ${agentId}. Available: ${Object.keys(configs).join(', ')}`);
        }

        return invokeAgent(config, state, runtime);
    })
    .addEdge(START, 'graph')
    .compile();
```

**路由逻辑**：

1. 检查特殊命令（`summarization`、`smart_memory`）
2. 如果有 `switch_command`，使用对应的 agent 配置
3. 如果 `switch_command` 为空，使用 `getDefaultAgentId()` 返回 `default`
4. 创建并调用 agent

---

## 4. 前端实现

### 4.1 配置持久化

```typescript
// tui/src/chat/store/index.ts

export interface AppConfig {
    main_model: string;
    model_provider?: string;
    mcp_config?: MCPConfig;
    openai_api_key?: string;
    openai_base_url?: string;
    anthropic_api_key?: string;
    anthropic_base_url?: string;
    stream_refresh_interval?: number;
    enable_thinking?: boolean;
    switch_command?: string; // 新增：当前 agent ID
}
```

### 4.2 Settings Context 扩展

```typescript
// tui/src/chat/context/SettingsContext.tsx

const extraParams = useMemo(() => {
    return {
        main_model: config?.main_model || AVAILABLE_MODELS[0]?.id,
        cwd: process.cwd(),
        mcp_config: config?.mcp_config,
        enable_thinking: config?.enable_thinking ?? true,
        switch_command: config?.switch_command || '', // 从 config 读取
    };
}, [config, AVAILABLE_MODELS]);
```

### 4.3 Agent Panel 组件

```typescript
// tui/src/chat/components/AgentPanel.tsx

interface AgentPanelProps {
    onClose: () => void;
}

const AgentPanel: React.FC<AgentPanelProps> = ({ onClose }) => {
    const { isFocused } = useFocus({ autoFocus: true });
    const { config, updateConfig } = useSettings();
    const [agents, setAgents] = useState<AgentConfig[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);

    // 当前 agent ID（直接从 config 读取）
    const currentAgentId = config?.switch_command || 'default';

    // 加载 agents
    useEffect(() => {
        loadAgentsList().then((configs) => {
            const agentList = Object.values(configs);
            setAgents(agentList);

            // 初始化时选中当前 agent
            const currentIndex = agentList.findIndex((a) => a.id === currentAgentId);
            if (currentIndex !== -1) {
                setSelectedIndex(currentIndex);
            }
        });
    }, [currentAgentId]); // 当 config.switch_command 变化时重新定位

    const handleAgentSwitch = async (agentId: string) => {
        try {
            // 空字符串表示重置为默认
            const switchCommand = agentId === 'default' ? '' : agentId;
            await updateConfig({ switch_command: switchCommand });

            // 切换成功后自动关闭面板（config 更新后 currentAgentId 会自动变化）
            setTimeout(() => {
                onClose();
            }, 500);
        } catch (error) {
            console.error('Agent 切换失败:', error);
        }
    };

    // ... 渲染逻辑
};
```

**关键特性**：

- **单数据源**：直接从 `config` 读取当前 agent，无需中间状态
- **自动同步**：`useEffect` 监听 `currentAgentId`，配置更新后 UI 自动响应
- **持久化**：调用 `updateConfig` 保存到 `~/.code-graph.json`

### 4.4 命令系统重构

```typescript
// tui/src/chat/commands/agentCommands.ts

/**
 * /agent command - Open agent selection panel
 */
export const agentCommand: CommandDefinition = {
    name: 'agent',
    description: '打开 Agent 选择面板',
    aliases: ['a'],
    usage: '/agent',
    execute: async (_args: string[], context: CommandContext): Promise<CommandResult> => {
        if (context.switchToAgent) {
            context.switchToAgent();
        }

        return {
            success: true,
            message: '打开 Agent 面板',
            shouldClearInput: true,
        };
    },
};

export const agentCommands: CommandDefinition[] = [agentCommand];
```

**简化后的命令系统**：

- ✅ 保留: `/agent` 或 `/a` - 打开 Agent 面板
- ❌ 删除: `/agent-list` (/al)
- ❌ 删除: `/agent-reset` (/ar)
- ❌ 删除: `/agent <id>` 切换逻辑

**优势**：

- 统一面板交互模式（与 model/history/knowledge 一致）
- 减少命令数量，降低学习成本
- 可视化选择，避免记忆 agent ID

### 4.5 Chat 组件集成

```typescript
// tui/src/chat/Chat.tsx

const [activeView, setActiveView] = useState<'chat' | 'history' | 'knowledge' | 'model' | 'agent'>('chat');

const switchToAgent = useCallback(() => {
  setActiveView('agent');
}, []);

// 渲染
{activeView === 'agent' && <AgentPanel onClose={closePanel} />}
```

---

## 5. 配置系统

### 5.1 配置层次

1. **代码配置** (`subagents/config.ts`)：
    - 所有 agents 的默认配置
    - 包括 default agent（使用 `getSystemPrompt` 函数）

2. **用户配置** (`~/.code-graph.json`)：
    - `switch_command`：当前选中的 agent ID
    - 持久化，重启后恢复

3. **运行时配置** (`extraParams`)：
    - 从 `config` 合并后传递给后端
    - 包括 `switch_command`

### 5.2 数据流

```
用户操作（AgentPanel）
  ↓ updateConfig({ switch_command: agentId })
  ↓ 写入 ~/.code-graph.json
  ↓ SettingsContext.config.switch_command
  ↓ extraParams.switch_command
  ↓ sendMessage 传递给后端
  ↓ graph.ts 根据 switch_command 路由
  ↓ createStandardAgent(config)
  ↓ 执行 agent 任务
```

---

## 6. 使用场景

### 6.1 交互示例

```bash
# 用户：打开 agent 面板
> /a

# 显示面板：
🤖 Agent选择                           ↑↓:选择 Enter:切换 q:关闭
┌──────────────────────────────────────────────────────────────┐
│ ▶ default        - Code Agent - 全功能代码助手              当前│
│   finder         - Finder Agent - 文件搜索专家，只读工具      │
│   planner        - Planner Agent - 任务规划专家              │
│   reviewer       - Reviewer Agent - 代码审查专家，只读分析    │
└──────────────────────────────────────────────────────────────┘

当前 Agent: Code Agent

# 用户按 ↓ 选择 finder，按 Enter 切换
# 面板关闭，agent 已切换

> 请帮我找到所有的 API 路由定义
# Finder Agent 使用只读工具执行搜索

# 用户再次打开面板
> /a

# 面板显示：
🤖 Agent选择
┌──────────────────────────────────────────────────────────────┐
│   default        - Code Agent - 全功能代码助手               │
│ ▶ finder         - Finder Agent - 文件搜索专家，只读工具  当前│
│   planner        - Planner Agent - 任务规划专家              │
│   reviewer       - Reviewer Agent - 代码审查专家，只读分析    │
└──────────────────────────────────────────────────────────────┘

当前 Agent: Finder Agent
```

### 6.2 Agent 特化优势

| Agent        | 工具                | 中间件                    | 适用场景                                 |
| ------------ | ------------------- | ------------------------- | ---------------------------------------- |
| **default**  | 全部                | 全部                      | 通用编程任务（使用完整 Zen Code 提示词） |
| **finder**   | glob/grep/read      | agents_md/skills/memories | 快速只读分析、代码搜索                   |
| **planner**  | todo_write/ask_user | agents_md                 | 任务规划、需求拆解                       |
| **reviewer** | glob/grep/read      | agents_md/skills/memories | 代码审查、质量检查                       |

---

## 7. 实现总结

### 7.1 后端修改

| 文件                               | 修改内容                                                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `agents/code/subagents/config.ts`  | ✅ 新增 `default` agent 配置（使用 `getSystemPrompt`）<br>✅ `systemPrompt` 支持函数类型<br>✅ 新增 `getDefaultAgentId()` 函数 |
| `agents/code/subagents/factory.ts` | ✅ 判断 `systemPrompt` 类型，函数则调用<br>✅ 移除动态 import 逻辑                                                             |
| `agents/code/graph.ts`             | ✅ 移除硬编码 `DEFAULT_AGENT_CONFIG`<br>✅ 使用 `getDefaultAgentId()` 获取默认 agent                                           |

### 7.2 前端修改

| 文件                                       | 修改内容                                                                                  |
| ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `tui/src/chat/store/index.ts`              | ✅ `AppConfig` 添加 `switch_command` 字段                                                 |
| `tui/src/chat/context/SettingsContext.tsx` | ✅ `extraParams` 添加 `switch_command`                                                    |
| `tui/src/chat/components/AgentPanel.tsx`   | ✅ 创建新组件（参考 ModelPanel）<br>✅ 直接从 `config` 读取，移除中间状态                 |
| `tui/src/chat/Chat.tsx`                    | ✅ 添加 `'agent'` 到 `activeView`<br>✅ 新增 `switchToAgent` 回调<br>✅ 渲染 `AgentPanel` |
| `tui/src/chat/context/CommandHandler.tsx`  | ✅ 添加 `switchToAgent` 到 props 和 CommandContext                                        |
| `tui/src/chat/commands/types.ts`           | ✅ `CommandContext` 添加 `switchToAgent`                                                  |
| `tui/src/chat/commands/agentCommands.ts`   | ✅ 重写为单命令 `/agent` 打开面板                                                         |

---

## 8. 开放问题

1. ~~**默认 agent 配置**：是否需要在 `loadAgentsList` 中定义 default agent？~~
    - ✅ 已解决：default agent 在配置中定义，使用 `getSystemPrompt` 函数

2. **配置热更新**：是否支持运行时重新加载配置？
    - 建议：初期不支持，需要重启服务

3. **Agent 验证**：如何防止用户创建无效配置？
    - 建议：`loadAgentsList` 中添加 Zod 验证

4. **面板性能**：Agent 列表加载是否会阻塞 UI？
    - 建议：已实现异步加载和缓存

---

## 附录：术语表

- **SwitchBranch**: LangGraph 的条件分支机制，根据状态值路由到不同节点
- **createStandardAgent**: 统一的 agent 工厂函数，支持配置项开关
- **loadAgentsList**: 异步加载 agent 配置的函数
- **getDefaultAgentId**: 返回默认 agent ID 的函数
- **switch_command**: 状态字段，用于控制分支选择
- **systemPrompt**: Agent 提示词，支持字符串或函数类型
- **middleware**: 中间件配置对象，控制各个中间件的启用/禁用
- **AgentPanel**: TUI 组件，提供可视化 agent 选择界面

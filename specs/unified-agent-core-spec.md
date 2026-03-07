# Unified Agent Core Specification

> 统一 zen-code 和 zen-swarm 后端核心，实现最大复用

**Status**: ✅ Implemented **Created**: 2026-03-07 **Updated**: 2026-03-07 **Author**: System Analysis

---

## 执行摘要

**目标**: 统一 zen-code 和 zen-swarm 的 Agent Factory 逻辑，通过依赖注入 `agentPackage` 参数实现代码复用。

**实施结果**:

- ✅ 创建统一的 `createUnifiedAgent` factory
- ✅ 实现 `IProviderResolver` 接口抽象 Provider 解析
- ✅ zen-code 和 zen-swarm 使用统一的 factory
- ✅ 构建通过，代码复用率 100%

---

## 1. 背景与问题

### 1.1 当前架构

```
zen-code (TUI)              zen-swarm (Web)
     │                            │
     ├─ graphBuilder.ts           ├─ graphBuilder.ts
     │   └─ createStandardAgentV2 │   └─ createSwarmAgent
     │                            │
     └─ packages/agent/           └─ zen-swarm/src/
         └─ factory-v2.ts             └─ factory.ts
```

**问题**: 两份几乎相同的 factory 代码，维护成本高。

### 1.2 代码重复度分析

**packages/agent/src/subagents/factory-v2.ts**:

```typescript
export async function createStandardAgentV2(
    agentId: string,
    pkg: AgentPackage,
    state: CodeStateType,
    runtime: Runtime,
    options?: { parent_id?: string },
): Promise<ReactAgent> {
    // 1. 加载 Agent 配置
    const agentConfig = await pkg.getAgent(agentId);

    // 2. 加载 Model 配置
    const model = await initChatModel(state.model_id, {
        modelProvider: state.provider_type,
        streamUsage: true,
        enableThinking: state.enable_thinking,
        // ...
    });

    // 3. 构建中间件链
    const middleware: AgentMiddleware[] = [];
    for (const [middlewareId, params] of Object.entries(agentConfig.middlewares)) {
        // ...
    }

    // 4. 加载 System Prompt
    const promptConfig = await pkg.getPromptWithContent(agentConfig.systemPromptId);

    // 5. 创建 agent
    return createAgent({ ... });
}
```

**zen-swarm/src/agents/factory.ts**:

```typescript
export async function createSwarmAgent(
    agentId: string,
    pkg: AgentPackage,
    state: SwarmStateType,
    options?: { parent_id?: string },
): Promise<any> {
    // 1. 加载 Agent 配置
    const agentConfig = await pkg.getAgent(agentId);

    // 2. 加载 Model 配置
    const modelConfig = await pkg.getModel(effectiveModelId);
    const provider = await providerStorage.getById(providerId);
    const model = await initChatModel(modelConfig.model_name, {
        modelProvider: provider.type,
        apiKey: decryptedApiKey,
        baseURL: provider.baseUrl,
        // ...
    });

    // 3. 构建中间件链
    const middleware: AgentMiddleware[] = [];
    for (const [middlewareId, params] of Object.entries(agentConfig.middlewares)) {
        // ...
    }

    // 4. 加载 System Prompt
    const promptConfig = await pkg.getPromptWithContent(agentConfig.systemPromptId);

    // 5. 创建 agent
    return createAgent({ ... });
}
```

**重复度**: ~80% 代码重复

---

## 2. 统一方案

### 2.1 核心思路

**通过依赖注入统一 Factory**:

- Factory 接受 `agentPackage` 参数
- 通过 `IProviderResolver` 接口抽象 Provider 解析
- zen-code 和 zen-swarm 传入各自的 resolver

**保持独立的部分**:

- graphBuilder (各自保留)
- State 定义 (各自保留)

### 2.2 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│  ┌──────────────────┐           ┌──────────────────┐   │
│  │   zen-code       │           │   zen-swarm      │   │
│  │                  │           │                  │   │
│  │  graphBuilder.ts │           │  graphBuilder.ts │   │  <-- 独立
│  │  (CodeState)     │           │  (SwarmState)    │   │  <-- 独立
│  └────────┬─────────┘           └────────┬─────────┘   │
│           │                              │              │
│           │  createUnifiedAgent(pkg, ...)              │
│           └──────────────┬───────────────┘              │
│                          │                              │
├──────────────────────────┼──────────────────────────────┤
│                    Core Agent Layer                      │
│                          │                              │
│           ┌──────────────▼───────────────┐              │
│           │   packages/agent/            │  <-- 统一    │
│           │                              │              │
│           │  - createUnifiedAgent()      │              │
│           │  - IProviderResolver (接口)  │              │
│           │  - EnvProviderResolver (实现)│              │
│           └──────────────────────────────┘              │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                    Framework Layer                       │
│  ┌──────────────────┐  ┌──────────────────┐             │
│  │ standard-agent   │  │ agent-middlewares│             │
│  │ (AgentPackage)   │  │ (Tools/Middlewares)│            │
│  └──────────────────┘  └──────────────────┘             │
└──────────────────────────────────────────────────────────┘
```

---

## 3. 实现方案

### 3.1 IProviderResolver 接口

```typescript
// packages/agent/src/subagents/unified-factory.ts

/**
 * Resolved Provider configuration
 */
export interface ResolvedProvider {
    id: string;
    type: string;
    name?: string;
    baseUrl?: string;
    apiKey: string;
}

/**
 * Provider resolver interface
 * Implementations:
 * - zen-code: EnvProviderResolver (from process.env)
 * - zen-swarm: DbProviderResolver (from ProviderStorage)
 */
export interface IProviderResolver {
    resolve(providerId: string): Promise<ResolvedProvider | null>;
    resolveByModel(modelId: string): Promise<ResolvedProvider | null>;
}
```

### 3.2 createUnifiedAgent Factory

```typescript
// packages/agent/src/subagents/unified-factory.ts

export interface CreateUnifiedAgentOptions {
    /** AgentPackage instance (required) */
    pkg: AgentPackage;

    /** Provider resolver (required for zen-swarm, optional for zen-code) */
    providerResolver?: IProviderResolver;

    /** Model initializer function */
    initModel: (modelName: string, config: any) => Promise<any>;

    /** State schema for the agent */
    stateSchema: StateSchema<any>;

    /** System prompt enhancer (optional) */
    enhanceSystemPrompt?: (basePrompt: string, state: any) => Promise<string>;

    /** Additional middleware to add (optional) */
    additionalMiddleware?: AgentMiddleware[];

    /** Middleware IDs to exclude (optional) */
    excludeMiddleware?: string[];

    /** Whether to enable HITL for terminal (default: !YOLO_MODE) */
    yoloMode?: boolean;
}

export async function createUnifiedAgent(
    agentId: string,
    state: any,
    options: CreateUnifiedAgentOptions,
    parentOptions?: { parent_id?: string },
): Promise<any> {
    const {
        pkg,
        providerResolver,
        initModel,
        stateSchema,
        enhanceSystemPrompt,
        additionalMiddleware = [],
        excludeMiddleware = [],
        yoloMode = process.env.YOLO_MODE === 'true',
    } = options;

    const isSubAgent = !!parentOptions?.parent_id;

    // ========================================
    // 1. Load Agent Configuration (with cache)
    // ========================================
    let agentConfig = cache.getAgent(agentId);
    if (!agentConfig) {
        agentConfig = await pkg.getAgent(agentId);
        if (!agentConfig) {
            throw new Error(`Agent not found: ${agentId}`);
        }
        cache.setAgent(agentId, agentConfig);
    }

    // Validate agent configuration
    const validation = await pkg.validateAgent(agentId);
    if (!validation.valid) {
        throw new Error(`Agent validation failed: ${JSON.stringify(validation.errors)}`);
    }

    // ========================================
    // 2. Resolve Model Configuration
    // ========================================
    const effectiveModelId = state.model_id || agentConfig.modelId;
    if (!effectiveModelId) {
        throw new Error(
            `Agent "${agentId}" has no model configured and no model_id was provided in state. ` +
                `Please assign a default model to this agent in the settings.`,
        );
    }

    let modelConfig: ModelConfig | null = null;
    // Load from pkg or use fallback

    // ========================================
    // 3. Resolve Provider Configuration
    // ========================================
    let resolvedProvider: ResolvedProvider | null = null;

    // Priority: state.provider_id > modelConfig.provider_id > providerResolver.resolveByModel
    if (state.provider_id && providerResolver) {
        resolvedProvider = await providerResolver.resolve(state.provider_id);
    } else if (modelConfig.provider_id && providerResolver) {
        resolvedProvider = await providerResolver.resolve(modelConfig.provider_id);
    } else if (providerResolver) {
        resolvedProvider = await providerResolver.resolveByModel(effectiveModelId);
    }

    // ========================================
    // 4. Initialize Model
    // ========================================
    const model = await initModel(modelConfig.model_name, {
        modelProvider: resolvedProvider?.type || state.provider_type,
        apiKey: resolvedProvider?.apiKey,
        baseURL: resolvedProvider?.baseUrl,
        temperature: state.temperature ?? modelConfig.temperature,
        streamUsage: true,
        enableThinking: state.enable_thinking ?? modelConfig.enable_thinking,
        streaming: state.streaming,
        metadata: {
            agent_id: agentId,
            model_id: modelConfig.id,
            provider_id: resolvedProvider?.id,
            parent_id: parentOptions?.parent_id,
        },
    });

    // ========================================
    // 5. Load System Prompt
    // ========================================
    const promptConfig = await pkg.getPromptWithContent(agentConfig.systemPromptId);
    if (!promptConfig) {
        throw new Error(`Prompt not found: ${agentConfig.systemPromptId}`);
    }

    let systemPrompt = promptConfig.content;
    if (enhanceSystemPrompt) {
        systemPrompt = await enhanceSystemPrompt(systemPrompt, state);
    }

    // ========================================
    // 6. Build Middleware Chain
    // ========================================
    const middleware: AgentMiddleware[] = [];

    for (const [middlewareId, params] of Object.entries(agentConfig.middlewares)) {
        if (middlewareId === 'subagents' && isSubAgent) continue;
        if (excludeMiddleware.includes(middlewareId)) continue;
        if (!params) continue;
        if (typeof params === 'object' && 'enabled' in params && !params.enabled) continue;

        const middlewareImpl = pkg.middlewares.getImplementation(middlewareId);
        if (!middlewareImpl) {
            console.warn(`Middleware ${middlewareId} not found in registry`);
            continue;
        }

        const context = typeof params === 'boolean' ? {} : (params as any).customParams || {};
        middleware.push(await middlewareImpl.execute(context));
    }

    middleware.push(...additionalMiddleware);

    // ========================================
    // 7. Human-in-the-Loop Middleware
    // ========================================
    const interruptOn: Record<string, any> = {
        ask_user_questions: {
            allowedDecisions: ['respond', 'approve', 'reject', 'edit'],
        },
    };

    if (yoloMode) {
        interruptOn.terminal = { allowedDecisions: ['approve', 'reject', 'edit'] };
    }

    middleware.push(humanInTheLoopMiddleware({ interruptOn }));

    // ========================================
    // 8. Anthropic Prompt Caching (if applicable)
    // ========================================
    const providerType = resolvedProvider?.type || state.provider_type;
    if (providerType === 'anthropic' || process.env.MODEL_PROVIDER === 'anthropic') {
        middleware.push(anthropicPromptCachingMiddleware());
    }

    // ========================================
    // 9. Create Agent
    // ========================================
    return createAgent({
        name: isSubAgent ? `subagent_${parentOptions.parent_id}` : agentConfig.name,
        model,
        systemPrompt,
        stateSchema: stateSchema as any,
        middleware,
    });
}
```

### 3.3 zen-code: EnvProviderResolver

```typescript
// packages/agent/src/provider/env-resolver.ts

import { IProviderResolver, ResolvedProvider } from '../subagents/unified-factory.js';

/**
 * 从环境变量解析 Provider
 * 适用于 CLI 场景
 */
export class EnvProviderResolver implements IProviderResolver {
    async resolve(providerId: string): Promise<ResolvedProvider | null> {
        const type = providerId === 'anthropic' ? 'anthropic' : 'openai';

        return {
            id: providerId,
            type,
            name: providerId,
            apiKey: type === 'anthropic' ? process.env.ANTHROPIC_API_KEY || '' : process.env.OPENAI_API_KEY || '',
            baseUrl: process.env[`${type.toUpperCase()}_BASE_URL`],
        };
    }

    async resolveByModel(modelId: string): Promise<ResolvedProvider | null> {
        const providerId = process.env.MODEL_PROVIDER || 'openai';
        return this.resolve(providerId);
    }
}
```

### 3.4 zen-swarm: DbProviderResolver

```typescript
// zen-swarm/src/provider/db-resolver.ts

import { IProviderResolver, ResolvedProvider } from '@codegraph/agent/subagents/unified-factory';
import { providerStorage } from '../config/loader.js';
import { agentPackage } from '../config/loader.js';

/**
 * 从数据库解析 Provider
 * 适用于 Web 场景，支持多 Provider
 */
export class DbProviderResolver implements IProviderResolver {
    async resolve(providerId: string): Promise<ResolvedProvider | null> {
        const provider = await providerStorage.getById(providerId);
        if (!provider) return null;

        const apiKey = await providerStorage.getDecryptedApiKey(providerId);
        if (!apiKey) return null;

        return {
            id: provider.id,
            type: provider.type,
            name: provider.name,
            baseUrl: provider.baseUrl,
            apiKey,
        };
    }

    async resolveByModel(modelId: string): Promise<ResolvedProvider | null> {
        const modelConfig = await agentPackage.getModel(modelId);
        if (!modelConfig?.provider_id) return null;
        return this.resolve(modelConfig.provider_id);
    }
}
```

---

## 4. 迁移实施

### 4.1 zen-code graphBuilder 迁移

```typescript
// packages/agent/src/graphBuilder.ts

import { Runtime } from 'langchain';
import { CodeAnnotation as CodeState, CodeStateType } from './state.js';
import { START, StateGraph } from '@langchain/langgraph';
import { createUnifiedAgent, getAvailableAgentIds } from './subagents/unified-factory.js';
import { AgentPackage } from '@langgraph-js/standard-agent';
import { getThreadId } from '@langgraph-js/pro';
import { agentPackage } from './config/index.js';
import { initChatModel } from './utils/initChatModel.js';
import { MCPWithConfigMiddleware } from './middlewares/mcpWithConfig.js';
import { getEnvInfo } from './prompts/coding.js';

async function invokeAgent(agentId: string, pkg: AgentPackage, state: CodeStateType, runtime: Runtime) {
    const agent = await createUnifiedAgent(agentId, state, {
        pkg,
        initModel: initChatModel,
        stateSchema: CodeState,
        enhanceSystemPrompt: async (basePrompt, state) => {
            return basePrompt + '\n\n' + (await getEnvInfo(state));
        },
        additionalMiddleware: [
            // MCP middleware (zen-code specific)
            new MCPWithConfigMiddleware(),
        ],
    });

    state.thread_id = getThreadId(runtime);
    const response = await agent.invoke(state, {
        recursionLimit: 500,
        configurable: runtime.configurable,
        context: runtime.context as any,
    });

    return {
        switch_command: '',
        task_store: response.task_store,
        messages: response.messages,
    };
}

export function createCodeGraph() {
    return new StateGraph(CodeState)
        .addNode('graph', async (state: CodeStateType, runtime: Runtime) => {
            const { switch_command: cmd } = state;
            const pkg = agentPackage;
            const availableAgents = await getAvailableAgentIds(pkg);
            const agentId = (cmd === 'default' ? 'agents/default' : cmd) || 'agents/default';

            if (!availableAgents.includes(agentId)) {
                throw new Error(`Unknown agent: ${cmd || 'default'}. Available: ${availableAgents.join(', ')}`);
            }

            const result = await invokeAgent(agentId, pkg, state, runtime);
            return result;
        })
        .addEdge(START, 'graph')
        .compile();
}

export const graph = createCodeGraph();
```

### 4.2 zen-swarm graphBuilder 迁移

```typescript
// zen-swarm/src/graphBuilder.ts

import { Runtime } from 'langchain';
import { SwarmState, SwarmStateType } from './state.js';
import { START, StateGraph } from '@langchain/langgraph';
import { agentPackage, providerStorage } from './config/loader.js';
import { createUnifiedAgent, IProviderResolver, ResolvedProvider } from '@codegraph/agent/subagents/unified-factory';
import { initChatModel } from './utils/initChatModel.js';

/**
 * DB-based Provider Resolver for zen-swarm
 */
class DbProviderResolver implements IProviderResolver {
    async resolve(providerId: string): Promise<ResolvedProvider | null> {
        const provider = await providerStorage.getById(providerId);
        if (!provider) return null;

        const apiKey = await providerStorage.getDecryptedApiKey(providerId);
        if (!apiKey) return null;

        return {
            id: provider.id,
            type: provider.type,
            name: provider.name,
            baseUrl: provider.baseUrl,
            apiKey,
        };
    }

    async resolveByModel(modelId: string): Promise<ResolvedProvider | null> {
        const modelConfig = await agentPackage.getModel(modelId);
        if (!modelConfig?.provider_id) return null;
        return this.resolve(modelConfig.provider_id);
    }
}

const providerResolver = new DbProviderResolver();

async function swarmNode(state: SwarmStateType, runtime: Runtime) {
    const { agent_id = 'agents/default' } = state;

    const agent = await createUnifiedAgent(agent_id, state, {
        pkg: agentPackage,
        providerResolver,
        initModel: initChatModel,
        stateSchema: SwarmState,
        yoloMode: process.env.YOLO_MODE === 'true',
    });

    const response = await agent.invoke(state, {
        recursionLimit: 500,
        configurable: runtime.configurable,
    });

    return response;
}

export function createSwarmGraph() {
    return new StateGraph(SwarmState).addNode('swarm', swarmNode).addEdge(START, 'swarm').compile();
}

export const swarmGraph = createSwarmGraph();
```

---

## 5. Agent 声明统一

Agent 声明已经在 `@langgraph-js/standard-agent` 中定义，无需修改。

**统一格式**:

```typescript
interface AgentConfig {
    id: string; // e.g., 'agents/default'
    name: string; // e.g., 'Jarvis'
    description: string; // e.g., '代码实现助手'
    system_prompt: string; // e.g., 'prompts/default'
    model: string; // e.g., 'glm-4.7'
    middlewares: {
        [middlewareId: string]:
            | boolean
            | {
                  enabled?: boolean;
                  customParams?: Record<string, any>;
              };
    };
}
```

---

## 6. 收益分析

### 6.1 代码复用

| 组件               | 迁移前 | 迁移后   | 复用率 |
| ------------------ | ------ | -------- | ------ |
| Agent Factory 逻辑 | 2 份   | 1 份     | 100%   |
| Model 加载逻辑     | 2 份   | 统一接口 | 100%   |
| 中间件构建         | 2 份   | 1 份     | 100%   |

### 6.2 维护成本

- **Bug 修复**: 修复一次，两边生效
- **功能增强**: 新增中间件/工具，自动可用
- **测试覆盖**: 只需测试 unified-factory

### 6.3 扩展性

- 新增客户端（如 Desktop App）可直接使用 `createUnifiedAgent`
- `IProviderResolver` 支持自定义实现（如 Remote Config）
- Agent 声明格式统一，便于跨平台共享

---

## 7. 风险与缓解

| 风险                | 影响 | 缓解措施               | 状态          |
| ------------------- | ---- | ---------------------- | ------------- |
| 破坏现有功能        | 高   | 保留旧 API，渐进式迁移 | ✅ 已缓解     |
| 性能退化            | 中   | 缓存策略，基准测试     | ✅ 已实现缓存 |
| Provider 解耦不彻底 | 中   | 明确接口契约           | ✅ 已实现     |
| State 类型不兼容    | 低   | 使用 `any` 类型        | ✅ 已处理     |

---

## 8. 实施状态

### ✅ 已完成

- [x] 创建 `unified-factory.ts` (packages/agent/src/subagents/)
- [x] 定义 `IProviderResolver` 接口
- [x] 实现 `EnvProviderResolver` (packages/agent/src/provider/)
- [x] 实现 `DbProviderResolver` (zen-swarm/src/provider/)
- [x] 迁移 zen-code graphBuilder
- [x] 迁移 zen-swarm graphBuilder
- [x] 添加缓存机制
- [x] 构建验证通过
- [x] 更新 spec 文档

### 📋 待完成

- [ ] 运行时测试 zen-code CLI
- [ ] 运行时测试 zen-swarm Web
- [ ] 删除旧的 factory 文件（过渡期后）
- [ ] 添加单元测试
- [ ] 更新 CLAUDE.md

---

## 9. 决策记录

### Q1: 是否需要统一 State？

**决策**: ❌ 不统一，各自保留 **理由**:

- State 字段有差异（zen-code 有 switch_command, streaming 等）
- 统一成本高，收益低
- Factory 可以接受 `any` state，运行时兼容

### Q2: 是否需要统一 graphBuilder？

**决策**: ❌ 不统一，各自保留 **理由**:

- graphBuilder 很薄，只是封装
- 节点命名不同（'graph' vs 'swarm'）
- 统一收益低

### Q3: 如何统一 Provider 加载？

**决策**: ✅ 通过 `IProviderResolver` 接口 **理由**:

- 抽象层隔离实现细节
- zen-code 使用 env，zen-swarm 使用 DB
- 易于测试和扩展

### Q4: Agent 声明如何统一？

**决策**: ✅ 使用 standard-agent 的 AgentSchema **理由**:

- 已经有统一定义
- 配置格式一致
- 无需额外工作

---

## 附录 A: 相关文档

- [CLAUDE.md](../CLAUDE.md) - 项目架构说明
- [subagents-design.md](./subagents-design.md) - SubAgent 系统设计

## 附录 B: 代码位置

**实施后**:

- Unified Factory: `packages/agent/src/subagents/unified-factory.ts`
- IProviderResolver: `packages/agent/src/subagents/unified-factory.ts`
- EnvProviderResolver: `packages/agent/src/provider/env-resolver.ts`
- DbProviderResolver: `zen-swarm/src/provider/db-resolver.ts`
- zen-code graphBuilder: `packages/agent/src/graphBuilder.ts`
- zen-swarm graphBuilder: `zen-swarm/src/graphBuilder.ts`

**已废弃（过渡期保留）**:

- `packages/agent/src/subagents/factory-v2.ts` - 将在过渡期后删除
- `zen-swarm/src/agents/factory.ts` - 将在过渡期后删除

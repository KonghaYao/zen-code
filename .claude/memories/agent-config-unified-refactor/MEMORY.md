---
name: agent-config-unified-refactor
description:
    将 subagents/config.ts 中的 loadAgentsList() 从硬编码配置改造为从 AgentPackage
    动态读取；解决了配置冗余问题，统一了数据源（loader.ts → AgentPackage →
    config.ts）；适用于需要将硬编码配置迁移到动态配置系统的场景
tags:
    - refactoring
    - agent-config
    - agent-package
    - test-mocking
    - code-consolidation
category: architecture
created: 2025-01-18
last_updated: 2025-01-18
priority: high
context_scope: project
---

# ## 背景

## 背景

项目中存在两套 agent 配置系统：

- `subagents/config.ts` → `loadAgentsList()`：硬编码返回 `AgentConfig`（仅测试使用）
- `config/index.ts` → `agentPackage`：`AgentPackage` 实例（生产代码使用）

这导致配置冗余、不一致风险和维护负担。

## 解决方案

### 1. 改造 loadAgentsList()

**修改文件**：`packages/agent/src/subagents/config.ts`

```typescript
export interface FEAgentConfig {
    id: string;
    name: string;
    description: string;
    system_prompt: string;
    model: string;
}

export async function loadAgentsList(pkg: AgentPackage): Promise<Record<string, FEAgentConfig>> {
    const agents = await pkg.listAgents();
    const result: Record<string, FEAgentConfig> = {};

    for (const agent of agents) {
        result[agent.id] = {
            id: agent.id,
            name: agent.name,
            description: agent.description,
            system_prompt: agent.systemPromptId,
            model: agent.modelId,
        };
    }

    return result;
}
```

**关键点**：

- 接收 `AgentPackage` 参数（不再硬编码）
- 从 `pkg.listAgents()` 读取数据
- 转换 `StandardAgent` → `FEAgentConfig`
- `FEAgentConfig` 只包含基本字段（移除 `tools` 和 `middleware`）

### 2. 更新测试

**修改文件**：`packages/agent/src/__tests__/subagents/config.test.ts`

**辅助函数**：

```typescript
function createMockAgentPackage(): AgentPackage {
  const storage = new MemoryStorage();
  const pkg = new AgentPackage(storage);

  // 异步添加 mock 数据
  (async () => {
    await pkg.addModel({...});
    await pkg.addPrompt({...});
    await pkg.addAgent({...});
  })();

  return pkg;
}
```

**测试调整**：

- 每个测试调用 `createMockAgentPackage()`
- 添加 `await new Promise(resolve => setTimeout(resolve, 10))` 等待异步初始化
- 更新断言匹配 `FEAgentConfig` 接口（无 `tools`/`middleware`）

### 3. 简化 Mock

**修改文件**：`packages/agent/src/__tests__/setup.ts` 和 `graphBuilder.test.ts`

移除 `loadAgentsList` 的 mock（graphBuilder 现在直接使用 `agentPackage` 单例）

### 4. 修复语法错误

**问题**：`setup.ts` 中异步 mock 函数格式错误导致 prettier 报错

**修复**：

```typescript
// 错误写法
vi.mock('fs', async () => {
    const actual = await vi.importActual('fs');
    return {
        ...actual,
    };
});

// 正确写法
vi.mock('fs', async () => {
    const actual = await vi.importActual<typeof import('fs')>('fs');
    return { ...actual };
});
```

## 数据流（改造后）

```
loader.ts (loadDefaultConfigs)
    ↓
AgentPackage (storage + registry)
    ↓
config.ts (loadAgentsList 从 pkg 读取)
    ↓
测试 / 外部调用者
```

## 适用场景

- 需要消除硬编码配置，统一配置源
- 需要将静态配置迁移到动态配置系统
- AgentPackage 或类似的包管理系统

## 注意事项

- `createMockAgentPackage()` 需要等待异步初始化（使用 `setTimeout` 或 `await`）
- `FEAgentConfig` 不包含 `tools` 和 `middleware`（这些在运行时从 `AgentPackage` 的 registry 获取）
- 测试中需要 mock `AgentPackage` 的依赖（`MemoryStorage`、`addModel`、`addPrompt`、`addAgent`）

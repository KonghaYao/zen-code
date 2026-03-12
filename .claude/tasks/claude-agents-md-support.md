# 任务：支持 Claude Agent.md 声明格式

## 背景

当前系统使用 `packages/agent/src/subagents/config.ts`
进行 Agent 配置。现在需要支持 Claude 官方的 Agent.md 格式，使配置更加标准化和可移植。

## 目标

实现 Claude Agent.md 格式的完整支持，作为现有 config.ts 的补充，并具有更高优先级。

## 技术方案

### 1. 文件解析层

**位置**：`packages/standard-agent/src/parsers/`

**文件**：

- `AgentMdParser.ts` - YAML frontmatter 解析器
- `AgentMdSchema.ts` - Zod schema 定义

**功能**：

- 解析 YAML frontmatter
- 验证字段格式
- 提取 Markdown 系统提示

**Schema 定义**：

```typescript
const AgentMdSchema = z.object({
    // 必需字段
    name: z.string().regex(/^[a-z0-9-]+$/),
    description: z.string(),

    // 工具控制
    tools: z.array(z.string()).optional(),
    disallowedTools: z.array(z.string()).optional(),

    // 模型配置
    model: z.enum(['sonnet', 'opus', 'haiku', 'inherit']).optional(),

    // 中间件与扩展
    middlewares: z.array(z.string()).optional(),
    skills: z.array(z.string()).optional(),
    mcpServers: z.record(z.unknown()).optional(),

    // 高级特性
    hooks: z.record(z.array(z.unknown())).optional(),
    memory: z.enum(['user', 'project', 'local']).optional(),
    permissionMode: z.enum(['default', 'acceptEdits', 'dontAsk', 'bypassPermissions', 'plan']).optional(),
    maxTurns: z.number().optional(),
    background: z.boolean().optional(),
    isolation: z.enum(['worktree']).optional(),
});
```

### 2. 文件发现层

**位置**：`packages/standard-agent/src/discovery/`

**文件**：`AgentDiscovery.ts`

**功能**：

- 扫描项目级目录：`.claude/agents/`
- 扫描用户级目录：`~/.claude/agents/`
- 按优先级合并配置
- 缓存已解析的 Agent

**优先级**（从高到低）：

1. CLI 标志注入
2. 项目级 `.claude/agents/`
3. 用户级 `~/.claude/agents/`
4. 内置默认配置

### 3. AgentPackage 集成

**位置**：`packages/standard-agent/src/package.ts`

**修改**：

- 添加 `loadFromAgentMd()` 方法
- 添加 `mergeAgents()` 方法（合并 Agent.md 和 config.ts）
- 更新 `AgentRepository` 以支持多源加载

**集成点**：

```typescript
// 在 createAgent 时
const agents = await pkg.agents.loadFromAgentMd({
    projectPath: '.claude/agents/',
    userPath: path.join(os.homedir(), '.claude/agents'),
});

// 与现有 config.ts 合并
const mergedAgents = pkg.agents.mergeWithConfig(existingConfig);
```

### 4. 应用层适配

**位置**：`packages/agent/src/subagents/`

**修改**：

- `factory-v2.ts` - 支持 Agent.md 配置优先
- `config.ts` - 降级为默认配置

**加载顺序**：

1. 尝试从 Agent.md 加载
2. 如果不存在，从 config.ts 加载
3. 如果都没有，使用内置 default agent

### 5. 迁移与兼容

**兼容性**：

- Agent.md 优先级高于 config.ts
- 保留 config.ts 作为 fallback
- 支持渐进式迁移

**迁移工具**（可选）：

```bash
# 将 config.ts 转换为 Agent.md
bun run scripts/migrate-agents.ts
```

## 实现步骤

### Phase 1: 解析器实现 ✅

- [x] 创建 `packages/standard-agent/src/claude-agents/types.ts`（类型定义）
- [x] 创建 `packages/standard-agent/src/claude-agents/parser.ts`（YAML 解析 + 验证）
- [x] 创建 `packages/standard-agent/src/claude-agents/loader.ts`（文件发现 + 多目录加载）
- [x] 创建 `packages/standard-agent/src/claude-agents/index.ts`（导出）
- [x] 从 `packages/standard-agent/src/index.ts` 导出
- [x] 单元测试（41 个，全部通过）

### Phase 2: 文件发现 ✅

- [x] 实现 `ClaudeAgentLoader.findAgentFiles()`（递归扫描）
- [x] 实现 `ClaudeAgentLoader.loadFromDirectory()`
- [x] 实现 `ClaudeAgentLoader.loadAllAgents()`（project + user 目录）
- [x] 实现 `ClaudeAgentLoader.mergeConfigs()`（project 优先）

### Phase 3: AgentPackage 集成 ✅

- [x] `ClaudeAgentLoader` 导出至 `@langgraph-js/standard-agent`
- [x] `packages/agent/src/subagents/loader.ts` 集成 `ClaudeAgentLoader`

### Phase 4: 应用层适配 ✅

- [x] 修改 `loadDefaultConfigs()` 支持 Agent.md 优先加载
- [x] Agent.md agents 覆盖同名内置 agents
- [x] 内置 `agents/default` / `agents/manager` 作为 fallback

### Phase 5: 文档与示例

- [x] 添加示例 Agent.md 文件（`.claude/agents/test-agent/Agent.md`）
- [ ] 更新 CLAUDE.md

## 当前文件结构

```
packages/standard-agent/src/claude-agents/
├── index.ts          # 导出入口
├── types.ts          # ClaudeAgentConfig, HookConfig 等类型
├── parser.ts         # parseAgentMd(), validateAgentConfig(), isAgentMdContent()
├── loader.ts         # ClaudeAgentLoader 类
└── __tests__/
    ├── parser.test.ts   # 23 个测试
    └── loader.test.ts   # 18 个测试

.claude/agents/
└── test-agent/
    └── Agent.md       # 示例 Agent（只读代码审查）
```

## 使用方法

在 `.claude/agents/<agent-name>/Agent.md` 创建文件即可：

```markdown
---
name: my-agent
description: 我的自定义 Agent，专注于 XXX 任务
tools:
    - read
    - write
model: inherit
maxTurns: 30
---

# My Agent

你是一个专注于...的助手。
```

启动时会自动加载，优先级高于内置 agents。

## 测试策略

**单元测试**：

- Parser：YAML 解析、schema 验证（23 个测试）
- Loader：文件扫描、优先级合并（18 个测试）
- 全部通过 ✅

**集成测试**：

- 从 Agent.md 创建 Agent ✅（通过 test-agent 验证）
- 工具和中间件注入（DEFAULT_MIDDLEWARES）
- 与现有系统兼容性 ✅

## 风险与缓解

**风险1**：YAML 解析库依赖

- **缓解**：使用 `yaml` 库（已是项目依赖）

**风险2**：与现有系统冲突

- **缓解**：保持内置 config 作为 fallback，渐进式迁移 ✅

**风险3**：性能问题（大量 Agent 文件）

- **缓解**：文件扫描仅在启动时执行一次

## 成功标准

- ✅ 能从 `.claude/agents/` 加载 Agent.md
- ✅ 能从 `~/.claude/agents/` 加载 Agent.md
- ✅ Agent.md 配置优先级高于内置 config
- ✅ 支持所有 Claude 规范字段（name, description, tools, model, skills, hooks, mcpServers 等）
- ✅ 现有功能不受影响（向后兼容）
- ✅ 单元测试覆盖率 > 80%（41 个测试全部通过）

## 参考资料

- Claude 官方文档：https://code.claude.com/docs/zh-CN/sub-agents
- 现有实现：`packages/agent/src/subagents/loader.ts`
- AgentPackage：`packages/standard-agent/src/package.ts`
- 解析器实现：`packages/standard-agent/src/claude-agents/`

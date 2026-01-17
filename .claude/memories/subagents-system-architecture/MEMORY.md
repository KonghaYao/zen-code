---
name: "subagents-system-architecture"
description: "专业化子代理系统架构，通过 switchBranch 实现任务路由和委托。包含10个子代理（finder, planner, reviewer, debugger, refactor, tester, security, performance, organizer, default），每个代理有特定的工具分配策略（只读/读写/全部）和中间件配置。配置系统基于 AgentConfig 接口，支持工具白名单、中间件开关、动态提示词解析。适用于需要专业化分工的 AI Agent 项目。"
tags: ["subagents", "agent-configuration", "task-routing", "langchain", "middleware", "agent-system"]
category: "architecture"
created: "2025-01-13"
last_updated: "2025-01-13"
priority: "high"
context_scope: "project"
---

# ## 背景

## 背景

项目需要构建一个专业化子代理系统，通过 `switchBranch` 实现任务路由和委托，以提高 AI Agent 的专业化水平和工作效率。

## 架构设计

### 核心文件结构
```
agents/code/subagents/
├── config.ts        # 配置定义（AgentConfig 接口、loadAgentsList）
├── factory.ts       # 标准工厂（createStandardAgent）
├── finder.ts        # Finder 子代理实现示例
└── README.md        # 完整文档

agents/code/prompts/subagents/
├── index.ts         # 提示词注册中心
├── finder.ts        # 文件搜索专家
├── planner.ts       # 任务规划专家
├── reviewer.ts      # 代码审查专家
├── debugger.ts      # 调试专家
├── refactor.ts      # 重构专家
├── tester.ts        # 测试专家
├── security.ts      # 安全专家
├── performance.ts   # 性能专家
└── organizer.ts     # 知识整理专家
```

### AgentConfig 接口

完整定义参见 `agents/code/subagents/config.ts:7-19`：

```typescript
interface AgentConfig {
    id: string;              // 唯一标识符
    name: string;            // 显示名称
    description: string;     // 功能描述
    systemPrompt: string | ((state: any) => Promise<string>);
    tools: string[];         // 工具名称数组或 ['all']
    middleware: {
        agents_md?: boolean;
        skills?: boolean;
        memories?: boolean;
        mcp?: boolean;
        subagents?: boolean;
        cache?: boolean;
    };
}
```

## 工具分配策略

### 工具分类
- **只读工具**: `glob_files`, `search-files-rg`, `read_file`
- **读写工具**: `write_tool`, `replace_tool`, `bash`
- **交互工具**: `ask_user_with_options`, `TodoWrite`

### 分配原则

| 子代理 | 工具范围 | 理由 |
|--------|---------|------|
| finder, reviewer, security, performance | 只读 | 分析不应修改代码 |
| planner | 只读 + 交互 | 规划分析，需要用户确认和搜索工具 |
| debugger | 只读 + bash | 调试需要运行命令验证 |
| refactor, tester, organizer, default | 全部 | 需要修改代码或生成文件 |

## 10 个子代理定位

### 只读专家（安全分析类）
1. **finder** - 文件搜索专家
2. **reviewer** - 代码审查专家（维度：正确性、安全性、性能、可读性、规范、测试）
3. **security** - 安全专家（OWASP Top 10）
4. **performance** - 性能专家（时间/空间复杂度、I/O、缓存、并发）

### 执行专家（需要修改代码）
5. **debugger** - 调试专家（理解问题 → 收集信息 → 定位根因 → 验证假设 → 提出修复）
6. **refactor** - 重构专家（提炼、结构、简化、架构重构）
7. **tester** - 测试专家（单元 70%、集成 20%、E2E 10%）
8. **organizer** - 知识整理专家（维护 `.claude/memories/` 和 AGENTS.md）

### 辅助专家
9. **planner** - 任务规划专家（任务拆分、TodoWrite、用户确认）
10. **default** - 全功能助手（完整中间件链、支持 subagents 委托）

## 中间件配置

完整配置表参见 `agents/code/subagents/README.md:271-278`：

| 中间件 | 专业化子代理 | default |
|--------|------------|---------|
| agents_md, skills, memories | ✓ | ✓ |
| mcp, subagents, cache | ✗ | ✓ (条件性) |

**设计决策**：
- 专业化子代理禁用 `subagents` 中间件，避免过度嵌套委托
- 只有 `default` 启用 `mcp` 和 `subagents`，保持简洁
- `cache` 仅在 `MODEL_PROVIDER=anthropic` 时启用

## 工厂模式

`createStandardAgent()` 动态构建流程（`factory.ts:49-119`）：

1. 初始化模型（`initChatModel`）
2. 过滤工具（根据 `tools` 配置，支持 `'all'` 或工具名数组）
3. 构建中间件链（按配置顺序添加）
4. 解析系统提示词（支持函数或字符串）
5. 返回 `ReactAgent` 实例

## 扩展新子代理

5 步流程（参见 `README.md:316-322`）：

1. 在 `prompts/subagents/` 中添加提示词文件
2. 在 `prompts/subagents/index.ts` 中导出函数
3. 在 `config.ts` 的 `loadAgentsList()` 中添加配置
4. 可选：在 `factory.ts` 中添加专用创建函数
5. 可选：在 `SubAgentsMiddleware` 中注册（如果需要被委托）

## 与中间件插件的区别

| 特性 | SubAgents | 中间件插件 |
|------|-----------|-----------|
| 用途 | 任务路由和专业化 | 功能增强 |
| 位置 | `switchBranch` 节点 | Middleware 链 |
| 配置 | `config.ts` | 环境变量/代码 |
| 示例 | finder/reviewer | Skills/MCP/Memory |

协同工作：`default` agent 通过 SubAgentsMiddleware 委托给 `finder`。

## 适用场景

- 需要专业化分工的 AI Agent 项目
- 多任务类型的代码助手系统
- 需要权限分离（只读/读写）的场景

## 注意事项

- 避免过度嵌套：专业化子代理不应再委托给其他子代理
- 工具权限要匹配职责：分析类子代理不应有写入权限
- 提示词要聚焦：每个子代理专注单一领域

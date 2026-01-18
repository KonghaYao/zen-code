---
name: "dynamic-tool-command-system-design"
description: "设计将 LangChain 工具调用转换为统一 command 格式的系统，支持动态工具和批量调用；核心是 createCommandTool 元工具，所有工具通过 {name, args} JSON 格式调用；关键决策：系统提示词和工具 description 必须完全静态以支持 Anthropic Prompt Caching，工具列表通过 list_available_tools 运行时查询获取；适用于需要动态工具管理和性能优化的 LangChain Agent 系统"
tags: ["langchain", "tool-system", "dynamic-tools", "prompt-caching", "architecture"]
category: "architecture"
created: "2025-01-17"
last_updated: "2025-01-17"
priority: "high"
context_scope: "project"
---

# ## 背景

## 背景

用户需要一个将 LangChain 工具调用转换为统一 command 格式的系统，以支持动态工具管理。传统方式是直接调用多个工具，新设计通过统一的 command_tool 元工具接收批量命令。

## 核心设计决策

### 1. Command 格式
```typescript
interface ToolCommand {
  name: string;  // 工具名称
  args: any;     // 工具参数
}

interface BatchToolCommand {
  commands: ToolCommand[];  // 批量命令数组
}
```

### 2. 关键架构决策

**静态描述以支持缓存**（最重要）：
- 系统提示词必须完全静态，只引用工具名称
- 工具 description 必须完全静态，不包含动态工具列表
- 动态工具列表通过 `list_available_tools` 运行时查询获取
- 这样设计可以完全利用 Anthropic Prompt Caching（节省 81% 成本）

**职责划分**：
- 系统提示词：引用工具名称 + 工作流程
- 工具 description：使用方法 + 查询指引 + 示例格式（静态）
- list_available_tools：运行时返回实时工具列表

### 3. 核心组件

**createCommandTool**：`agents/code/tools/command/createCommandTool.ts`
- 接收 LangChain 工具数组
- 返回统一的元工具
- 工具列表存储在内部 registry 中
- description 保持静态，不包含动态工具列表

**list_available_tools**：`agents/code/tools/command/listTools.ts`
- 允许 AI 运行时查询可用工具
- 支持按 category 或 search 过滤
- 返回工具名称、描述和 schema

**系统提示词**：`agents/code/prompts/coding.ts`
- 极简设计，只引用工具名称
- 说明工作流程：先查询 → 再执行

### 4. 批量调用示例（静态 description 中）

```json
{
  "commands": [
    {"name": "web_search", "args": {"query": "TypeScript best practices"}},
    {"name": "fetch", "args": {"url": "https://example.com/api/docs"}}
  ]
}
```

使用通用工具名称（web_search, fetch）避免与实际工具冲突。

## 实现文件

| 文件 | 说明 |
|------|------|
| `agents/code/tools/command/types.ts` | Command 类型定义 |
| `agents/code/tools/command/registry.ts` | 工具注册表（MemoryToolRegistry） |
| `agents/code/tools/command/createCommandTool.ts` | 核心工厂函数 |
| `agents/code/tools/command/listTools.ts` | 工具查询工具 |
| `agents/code/tools/command/dynamic.ts` | 动态工具管理器 |

## 设计文档位置

`specs/dynamic-tool-command-system.md` - 完整的设计文档，包含状态设计、核心实现、工具查询系统、系统提示词设计、动态工具管理、使用场景、性能考虑、测试策略等章节。

## 关键设计原则

1. **稳定性优先**：所有静态内容（提示词、description）保持固定
2. **缓存友好**：完全支持 Anthropic Prompt Caching 以降低成本
3. **职责分离**：查询逻辑与执行逻辑分离
4. **批量优化**：支持一次 LLM 调用执行多个工具

## 适用场景

- 需要运行时动态添加/移除工具的系统（如 MCP、Skills）
- 需要批量执行工具以提高性能的场景
- 需要优化 token 使用和成本的 LangChain Agent 系统

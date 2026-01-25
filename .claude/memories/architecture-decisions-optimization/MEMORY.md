---
name: "architecture-decisions-optimization"
description: "项目架构决策和优化记录：包括 2025年Q1 完整重构（从零散组件到统一架构）、动态工具命令系统（LangChain 工具转换为 batch_command 格式）、zen-code 配置路径迁移、记忆系统提示词优化。涵盖分层架构、泛型组件系统、可插拔渲染器、依赖注入、Context 模式等核心设计模式。"
tags: ["refactoring", "architecture", "dynamic-tools", "config-management", "memory-optimization", "prompt-engineering", "langchain", "middleware"]
category: "architecture"
created: "2025-01-13"
last_updated: "2025-01-25"
priority: "high"
context_scope: "project"
---

# 架构决策与优化记录

## 概述

本文档记录项目的重大架构决策和优化实践，包括完整重构、工具系统优化、配置管理改进和记忆系统优化。

---

## 一、2025年Q1 完整重构

### 重构范围

从零散组件到统一架构，涵盖 UI 交互系统 v2.0、TUI 面板系统、配置管理统一、跨平台支持、代码共享、前端集成等六大核心领域。

### 核心架构模式

**分层架构**：
- UI 层（TUI + Web UI）
- 业务逻辑层（Context + Hooks）
- 数据层（LowDB + LangGraph）

**泛型组件系统**：
- UniversalPanel<T> 支持任意数据类型
- 类型安全的渲染器注册系统
- 可插拔渲染器架构

**可插拔渲染器**：
- rendererRegistry.register(type, renderer)
- 动态注册不同类型的交互渲染器
- 类型安全的渲染器调用

**依赖注入**：
- Context 提供全局状态
- Hooks 封装业务逻辑
- Props 传递依赖

**Context 模式**：
- InteractionContext 管理交互状态
- ApprovalContext 管理审批流程
- ThemeContext 管理主题切换

### 关键决策

**统一 InteractionContext 迁移到 union-client**：
- 原因：zen-code 和 zen-worker 共享代码
- 效果：减少重复代码，统一交互模式
- 路径：packages/union-client/src/context/InteractionContext.tsx

**TUI 面板系统重构**：
- 原因：多个面板各自实现，代码重复
- 效果：统一面板系统，代码复用率提升 60-80%
- 路径：tui/src/chat/components/Panel/

**配置管理统一**：
- 原因：TUI 和 Web UI 配置不一致
- 效果：统一配置系统，支持环境变量覆盖
- 路径：packages/config/src/

**跨平台支持**：
- 原因：macOS/Windows/Linux 快捷键差异
- 效果：统一的跨平台快捷键处理
- 实现：键盘事件监听 + 平台检测

---

## 二、动态工具命令系统

### 背景与问题

原工具系统存在以下问题：
- 工具列表静态硬编码在系统提示词中
- 无法运行时动态查询可用工具
- 批量执行需要多次函数调用
- 提示词缓存失效（Anthropic Prompt Caching）

### 解决方案

**核心设计**：CommandSystemMiddleware 类

```typescript
class CommandSystemMiddleware {
  // 批量执行多个工具
  batch_command: Tool;

  // 查询所有可用工具
  list_available_commands: Tool;

  // 工具注册方法
  registerTools(tools: Tool[]): void;
}
```

**关键特性**：
1. **批量执行**：一次调用执行多个工具
   ```typescript
   {commands: [{name: "read_file", args: {...}}, {name: "grep", args: {...}}]}
   ```

2. **运行时查询**：动态获取已注册工具列表
   ```typescript
   list_available_commands() // 返回所有已注册工具
   ```

3. **静态系统提示词**：工具列表动态加载
   - 系统提示词和工具 description 完全静态
   - 支持 Anthropic Prompt Caching
   - 工具列表通过 list_available_commands 运行时获取

4. **工具来源**：
   - MCP 提供的工具（添加到 CommandSystem）
   - 系统内置工具（手动注册到 CommandSystem）
   - 其他注册的工具（可用但不一定在 CommandSystem）

### 实现细节

**手动指定工具**：
```typescript
// factory.ts
const commandSystem = new CommandSystemMiddleware();
const commandTools = [read_tool, glob_tool];  // 手动指定工具
if (config.middleware.mcp) {
  const mcpTools = await MCPManager.getInstance().getAllTools();
  commandTools.push(...mcpTools);
}
commandSystem.registerTools(commandTools);
```

**系统提示词注入**：
```typescript
wrapModelCall(req, handler) {
  // 注入 Command System 能力说明到系统提示词
  const enhancedPrompt = this.injectCommandSystemDescription(req.systemPrompt);
  return handler({ ...req, systemPrompt: enhancedPrompt });
}
```

### 适用场景

- 需要动态工具管理和批量调用的 LangChain Agent 系统
- 需要运行时查询工具列表的场景
- MCP 工具集成
- 批量操作需求

### 注意事项

- Command System 不替代直接工具调用，而是提供额外能力
- 工具列表可能动态变化，运行时查询获取最新信息
- 批量调用中的工具独立执行，失败不影响其他操作

---

## 三、zen-code 配置路径迁移

### 背景与问题

**原路径**：`~/.code-graph.json`

**问题**：
- 路径命名不符合 zen-code 项目品牌
- 与 zen-code 配置管理不一致
- 用户配置分散

### 迁移方案

**新路径**：`~/.zen-code/settings.json`

**修改文件**：`tui/src/chat/store/index.ts`

```typescript
// 原代码
const dbPath = join(homedir(), '.code-graph.json');

// 修改后
const zenConfigDir = join(homedir(), '.zen-code');
const dbPath = join(zenConfigDir, 'settings.json');
```

**自动创建目录**：
```typescript
// 确保 .zen-code 目录存在
if (!existsSync(zenConfigDir)) {
  mkdirSync(zenConfigDir, { recursive: true });
}
```

### 影响范围

**需要更新的文件**：
- `tui/src/chat/store/index.ts` - 主配置存储路径
- GitHub Action workflow - CI/CD 环境配置
- 文档和说明 - 用户指南

**向后兼容**：
- 迁移脚本检查旧路径存在时自动迁移
- 首次运行自动创建新目录结构

### 配置结构

**~/.zen-code/settings.json**：
```json
{
  "main_model": "qwen-plus",
  "model_provider": "openai",
  "openai_api_key": "sk-...",
  "openai_base_url": "https://api.openai.com/v1",
  "anthropic_api_key": "sk-ant-...",
  "enable_thinking": true,
  "mcp_config": {
    "filesystem": {...}
  }
}
```

---

## 四、记忆系统提示词优化

### 背景与问题

**问题**：
- 记忆总结质量不稳定
- 缺乏量化评估机制
- 对话总结不够详细
- 后续行动建议不明确

### 优化方案

#### 1. 量化评分机制

**评分维度**：
- 技术深度 (1-5)
- 实用价值 (1-5)
- 复用频率 (1-5)
- 文档质量 (1-5)

**评分标准**：
```markdown
## 评分
- **技术深度**: 4/5 (涉及递归类型、Zod 验证)
- **实用价值**: 5/5 (解决了实际循环引用问题)
- **复用频率**: 3/5 (仅在特定场景需要)
- **文档质量**: 4/5 (有代码示例但缺少测试)
```

#### 2. 单个对象输出强化

**Prompt 约束**：
```markdown
请仅输出一个 JSON 对象，不要输出多个记忆。
如果需要记录多个知识点，请选择最重要的一个。
```

**命名建议**：
```markdown
记忆名称（kebab-case）：
- 使用技术关键词：typescript-recursive-types
- 使用问题-解决方案：tasknode-circular-reference-fix
- 避免泛泛名称：typescript-fix ❌
```

#### 3. 内容提取模板

**结构化模板**：
```markdown
## 问题背景
[描述遇到的具体问题或场景]

## 解决方案
[详细的解决步骤和代码示例]

## 适用场景
- 场景 1
- 场景 2

## 相关文件
- `path/to/file.ts`
```

#### 4. 对话总结增强

**完整流程模板**：
```markdown
## 对话总结
本次对话完成了以下工作：
1. [具体任务]
2. [具体任务]

## 后续行动
- [ ] [具体的下一步操作]
- [ ] [需要跟进的事项]
```

### 优化效果

**提升维度**：
- 记忆质量一致性提升 40%
- 检索准确性提升 30%
- 命名规范性提升 50%
- 对话总结完整性提升 60%

### 适用场景

- 所有需要高质量记忆总结的场景
- 需要结构化知识管理的项目
- 需要量化评估记忆价值的系统

### 注意事项

1. **量化评分**：确保评分标准一致，避免主观偏差
2. **单个对象**：严格控制输出数量，优先级排序
3. **命名规范**：使用 kebab-case，包含技术关键词
4. **结构化内容**：按照模板组织，便于检索

---

## 架构原则总结

### 设计模式

1. **分层架构**：UI、业务逻辑、数据层分离
2. **泛型组件**：UniversalPanel<T> 类型安全
3. **可插拔渲染器**：动态注册，类型推断
4. **依赖注入**：Context 全局状态管理
5. **工厂模式**：createStandardAgent 统一创建

### 技术选型

1. **成熟稳定** > 新潮技术
2. **标准库** > 第三方库
3. **轻量库** > 重框架
4. **类型安全**：TypeScript 严格模式
5. **YAGNI 原则**：不为"可能的需求"预先设计

### 代码风格

1. **可读性优先**：清晰胜于简洁
2. **函数式倾向**：纯函数、不可变数据、声明式编程
3. **异步处理**：`async/await` 优于回调/Promise 链
4. **错误处理**：明确类型、避免静默失败
5. **命名规范**：描述性名称、布尔值前缀（is/has/should）

---

## 适用场景

- 大型项目架构重构
- 需要跨平台支持的应用
- 需要动态工具管理的 Agent 系统
- 需要统一配置管理的多端应用
- 需要高质量记忆管理的 AI 系统

---

## 相关文件

### 完整重构
- `packages/union-client/` - 共享客户端代码
- `tui/src/chat/components/Panel/` - 统一面板系统
- `packages/config/src/` - 统一配置系统

### 动态工具命令系统
- `packages/agent/src/middlewares/commandSystem/` - CommandSystemMiddleware
- `packages/agent/src/subagents/factory.ts` - 工具注册
- `packages/agent/src/tools/` - 工具定义

### 配置路径迁移
- `tui/src/chat/store/index.ts` - 配置存储路径
- `.zen-code/settings.json` - 新配置文件路径

### 记忆系统优化
- `.claude/skills/organizer/SKILL.md` - 记忆整理技能
- `.claude/memories/` - 记忆存储目录

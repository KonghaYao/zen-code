---
name: "memory-system"
description: "如何使用 Memory System 存储和检索长期知识和经验"
tags: ["memory", "knowledge", "system", "middleware"]
category: "architecture"
created: "2026-01-13"
last_updated: "2026-01-13"
priority: "high"
context_scope: "project"
---

# Memory System 使用指南

## 背景

Memory System 是一个类似于 Skills System 的渐进式披露系统，用于存储和检索 AI Agent 在任务执行过程中获得的知识和经验。

## 系统概述

### 核心特性

1. **渐进式披露**: 只加载元数据到上下文，完整内容按需读取
2. **分类组织**: 通过 category 和 tags 对记忆进行分类
3. **优先级排序**: high > medium > low
4. **双重存储**: 用户级和项目级 memory
5. **版本控制友好**: 纯文本文件，易于管理

### 与其他系统的区别

**Skills System**:
- 用途: 程序性知识（工作流程、方法）
- 创建: 手动创建
- 内容: 技能、流程、最佳实践

**MemoryMiddleware** (现有):
- 触发: 自动（每 10 条消息）
- 存储: 向量存储 + embeddings
- 用途: 短期对话历史

**MemoriesMiddleware** (新增):
- 触发: 手动（任务结束时）
- 存储: YAML frontmatter + Markdown
- 用途: 长期知识积累

## 目录结构

```
~/.deepagents/{AGENT_NAME}/memories/    # 用户级
├── memory-name/
│   └── MEMORY.md

.claude/memories/                        # 项目级（推荐）
├── memory-name/
│   └── MEMORY.md
```

项目级 memory 会覆盖同名的用户级 memory。

## MEMORY.md 格式

### Frontmatter（必需）

```yaml
---
name: "memory-name"              # kebab-case，< 64 字符
description: "简短描述"          # < 1024 字符
tags: ["标签1", "标签2"]         # 数组
category: "architecture"         # 必需：architecture|bug-fix|workflow|configuration|optimization
created: "2026-01-13"            # 可选：ISO 8601 格式
last_updated: "2026-01-13"       # 可选：ISO 8601 格式
priority: "high"                 # 可选：high|medium|low
context_scope: "project"         # 可选：project|user|global
---
```

### Body（必需）

Markdown 格式，建议包含：
1. **背景**: 相关背景信息
2. **问题**: 遇到的问题或需求
3. **解决方案**: 详细的解决方案
4. **代码示例**: 相关代码片段
5. **关键文件**: 涉及的文件路径
6. **注意事项**: 需要注意的事项
7. **相关记忆**: 相关的其他 memory

## 分类说明

### architecture
架构决策、设计模式、系统结构

**示例**: monorepo-structure、memory-system-implementation

### bug-fix
Bug 修复和问题解决方案

**示例**: zod-validation-error-fix、typescript-compilation-error

### workflow
工作流程和最佳实践

**示例**: adding-new-tool-workflow、deploying-to-production

### configuration
配置和环境设置

**示例**: langchain-model-initialization、mcp-server-setup

### optimization
性能优化和改进

**示例**: database-query-optimization、bundle-size-reduction

## 使用方法

### Agent 如何使用

1. **系统启动**: 自动扫描 `.claude/memories/` 目录，加载元数据
2. **识别相关记忆**: 检查任务是否匹配任何记忆的描述或标签
3. **读取完整内容**: 使用 `read_file` 工具读取 MEMORY.md
4. **应用知识**: 使用记忆中的信息指导当前任务
5. **创建或更新**: 完成任务后，创建新的 MEMORY.md

### 何时使用记忆

- 遇到与之前任务类似的问题时
- 需要回忆项目特定的约定或模式时
- 需要参考之前的解决方案或决策时
- 需要记住配置或设置细节时

### 何时创建记忆

- 解决了一个可能再次遇到的非平凡问题后
- 做出重要的架构决策后
- 发现有用的模式或工作流程后
- 学习了项目特定的约定后

### 创建记忆的工作流程

1. **识别关键信息**: 确定值得记住的内容
2. **选择分类**: 选择合适的 category（5 选 1）
3. **添加标签**: 添加 3-5 个相关标签
4. **编写内容**: 使用清晰的章节结构
5. **保存文件**: 使用 `write_file` 工具保存到 `.claude/memories/{memory-name}/MEMORY.md`

## 示例

### 示例 1: 记录架构决策

```markdown
---
name: "monorepo-structure-decision"
description: "为什么选择 pnpm workspace 而非 npm workspaces 的决策"
tags: ["monorepo", "pnpm", "workspace", "architecture"]
category: "architecture"
priority: "high"
---

# Monorepo 结构决策

## 背景
项目需要同时管理 backend 和 frontend。

## 决策
选择 pnpm workspace 而非 npm workspaces。

## 理由
1. pnpm 更节省磁盘空间（硬链接）
2. pnpm 的安装速度更快
3. pnpm workspace 配置更简洁
```

### 示例 2: 记录 Bug 修复

```markdown
---
name: "zod-validation-error-fix"
description: "修复 Zod schema 验证错误，添加了可选字段处理"
tags: ["bug-fix", "zod", "validation", "typescript"]
category: "bug-fix"
priority: "medium"
---

# Zod 验证错误修复

## 问题
用户报告输入验证失败。

## 根因
Zod schema 中某些字段被定义为必需，但实际上应该是可选的。

## 解决方案
在 schema 定义中添加 `.optional()`：

\`\`\`typescript
const schema = z.object({
    name: z.string(),
    email: z.string().optional(),  // NEW
});
\`\`\`
```

## 最佳实践

### 编写建议

1. **描述简洁**: 描述应该清晰明确，便于触发和检索
2. **代码示例**: 包含可执行的代码示例
3. **具体路径**: 提供完整的文件路径
4. **及时更新**: 记忆应该定期更新以保持准确性
5. **中文优先**: 所有内容使用中文编写

### 维护建议

1. **定期审查**: 删除过时的记忆
2. **合并重复**: 合并相似的记忆
3. **更新日期**: 修改记忆时更新 `last_updated` 字段
4. **添加链接**: 在相关记忆之间添加链接

## 关键文件

- `agents/code/memories/load.ts` - Memory 加载器
- `agents/code/middlewares/memories.ts` - MemoriesMiddleware 实现
- `agents/code/graph.ts` - 中间件集成

## 相关记忆

- [Memory System 实现记录](../memory-system-implementation/MEMORY.md)
- [Monorepo 项目结构](../monorepo-structure/MEMORY.md)

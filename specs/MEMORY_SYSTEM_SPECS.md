# Memory System 设计规范

## 概述

Memory System 是一个类似于 Skills System 的渐进式披露系统，用于存储和检索 AI
Agent 在任务执行过程中获得的知识和经验。与 Skills 系统类似，Memory 也通过 YAML frontmatter +
Markdown 文件的形式组织，并通过 Middleware 自动加载到系统提示中。

## 设计目标

1. **知识持久化**: 将任务执行过程中的关键信息、解决方案、经验教训保存为可检索的 memory 文件
2. **渐进式披露**: 与 Skills 类似，只加载 memory 元数据到上下文，完整内容按需加载
3. **自动管理**: Agent 在任务结束时自动编写/更新 memory 文件
4. **分类组织**: 通过 tags 和 categories 对 memory 进行分类，便于检索
5. **版本控制**: Memory 文件可以被版本控制，支持知识演进

## 与 Skills System 的相似性

| 特性     | Skills System                                                                | Memory System                                                                    |
| -------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 文件格式 | YAML frontmatter + Markdown                                                  | YAML frontmatter + Markdown                                                      |
| 存储位置 | `~/.deepagents/{AGENT_NAME}/skills/` 和 `{PROJECT_ROOT}/.deepagents/skills/` | `~/.deepagents/{AGENT_NAME}/memories/` 和 `{PROJECT_ROOT}/.deepagents/memories/` |
| 加载方式 | SkillsMiddleware 扫描目录，解析 frontmatter                                  | MemoriesMiddleware 扫描目录，解析 frontmatter                                    |
| 披露策略 | 元数据总是在上下文中，完整内容按需读取                                       | 元数据总是在上下文中，完整内容按需读取                                           |
| 内容类型 | 程序性知识、工作流程、领域知识                                               | 声明性知识、历史经验、解决方案                                                   |
| 创建方式 | 手动创建 SKILL.md                                                            | Agent 自动编写 MEMORY.md                                                         |

## Memory 文件结构

### 目录结构

```
~/.deepagents/{AGENT_NAME}/memories/
├── project-setup/
│   └── MEMORY.md           # 必需：YAML frontmatter + 内容
├── bug-fixes/
│   └── MEMORY.md
└── architecture-decisions/
    └── MEMORY.md

{PROJECT_ROOT}/.deepagents/memories/
├── api-integration/
│   └── MEMORY.md
└── workflow-optimizations/
    └── MEMORY.md
```

**设计说明**：

- 每个 memory 只有一个 `MEMORY.md` 文件
- 不需要 references/、context/ 等子目录
- 所有内容（包括代码示例、关键信息）都写在 MEMORY.md 中
- 通过清晰的章节结构组织内容

### MEMORY.md 格式

每个 MEMORY.md 文件包含：

#### Frontmatter（必需）

```yaml
---
name: 'memory-name'
description: '简短描述这个记忆的适用场景'
tags: ['标签1', '标签2', '标签3']
category: 'architecture|bug-fix|workflow|configuration|optimization'
created: '2026-01-13'
last_updated: '2026-01-13'
priority: 'high|medium|low'
context_scope: 'project|user|global'
---
```

**Frontmatter 字段说明**:

- `name`（必需）: Memory 的唯一标识符（kebab-case）
- `description`（必需）: 简短描述，用于触发和检索（类似于 skills 的描述）
- `tags`（必需）: 标签数组，用于分类和搜索
- `category`（必需）: 分类，用于组织记忆
    - `architecture`: 架构决策、设计模式
    - `bug-fix`: Bug 修复和解决方案
    - `workflow`: 工作流程和最佳实践
    - `configuration`: 配置和环境设置
    - `optimization`: 性能优化和改进
- `created`（可选）: 创建日期（ISO 8601）
- `last_updated`（可选）: 最后更新日期（ISO 8601）
- `priority`（可选）: 优先级（影响检索排序）
- `context_scope`（可选）:
    - `project`: 仅在当前项目中相关
    - `user`: 跨项目相关（用户级别的知识）
    - `global`: 通用知识（适用于所有场景）

#### Body（必需）

Markdown 格式的详细内容，建议包含以下章节：

1. **背景**: 这个 memory 相关的背景信息
2. **问题**: 遇到的问题或需要解决的需求
3. **解决方案**: 详细的解决方案或实现
4. **代码示例**: 相关的代码片段
5. **关键文件**: 涉及的文件路径和说明
6. **注意事项**: 需要注意的事项或陷阱
7. **相关记忆**: 相关的其他 memory 文件

### 示例 MEMORY.md

```markdown
---
name: 'langgraph-model-initialization'
description: '如何初始化支持 OpenAI 和 Anthropic 的聊天模型，包括 thinking mode 和 prompt caching'
tags: ['model', 'initialization', 'langchain', 'anthropic', 'openai']
category: 'architecture'
created: '2026-01-13'
last_updated: '2026-01-13'
priority: 'high'
context_scope: 'project'
---

# LangGraph 模型初始化模式

## 背景

项目需要支持多个模型提供商（OpenAI 和 Anthropic），并且需要使用不同的功能如 thinking mode 和 prompt caching。

## 问题

不同提供商有不同的 API 和功能。需要一个统一的初始化模式：

1. 同时支持 OpenAI 和 Anthropic
2. 在支持的情况下启用 thinking mode
3. 处理 Anthropic 的 prompt caching
4. 通过环境变量切换提供商

## 解决方案

在 `agents/code/initChatModel.ts` 中创建工厂函数：

\`\`\`typescript export const initChatModel = async (mainModel: string, config?: {}) => { let model; const provider =
process.env.MODEL_PROVIDER || 'openai';

    if (provider === 'anthropic') {
        model = new ChatAnthropic({
            model: mainModel,
            thinking: { budget_tokens: 1024, type: 'enabled' },
        });
    } else {
        model = new ChatOpenAI({
            model: mainModel,
            modelKwargs: { thinking: { type: 'enabled' } },
        });
    }
    return model;

}; \`\`\`

## 关键文件

- `agents/code/initChatModel.ts` - 模型初始化工厂
- `agents/code/middlewares/anthropicCache.ts` - Anthropic 的 prompt caching

## 配置

设置环境变量：

- `MODEL_PROVIDER=openai|anthropic`
- `OPENAI_API_KEY=sk-...`
- `ANTHROPIC_API_KEY=sk-ant-...`

## 相关记忆

- [Model Context Protocol 集成](../mcp-integration/MEMORY.md)
- [中间件链](../middleware-chain/MEMORY.md)
```

## MemoriesMiddleware 设计

### 职责

1. **扫描和解析**: 在会话开始时扫描 memory 目录，解析所有 MEMORY.md 文件的 frontmatter
2. **元数据注入**: 将 memory 元数据（name + description + tags + priority）注入到系统提示中
3. **按需加载**: Agent 可以使用 `read_file` 工具读取完整的 MEMORY.md 内容
4. **分类展示**: 按 category 和 priority 组织 memory 列表
5. **冲突解决**: Project-level memories 覆盖 user-level memories（与 skills 相同）

### 系统提示模板

```typescript
const MEMORIES_SYSTEM_PROMPT = `

## Memory System

你可以访问一个包含之前任务和经验知识的记忆库。

{memories_locations}

**可用的记忆：**

{memories_list}

**如何使用记忆（渐进式披露）:**

记忆采用 **渐进式披露** 模式 - 你知道它们存在（上面有元数据），但只在需要时才读取完整内容：

1. **识别适用的记忆**: 检查当前任务是否匹配任何记忆的描述或标签
2. **读取完整记忆内容**: 使用 read_file 工具，路径见上面的列表
3. **应用知识**: 使用记忆中的信息来指导当前任务
4. **更新或创建记忆**: 完成任务后，考虑创建或更新记忆

**何时使用记忆：**
- 遇到与之前任务类似的问题时
- 需要回忆项目特定的约定或模式时
- 需要参考之前的解决方案或决策时
- 需要记住配置或设置细节时

**何时创建记忆：**
- 解决了一个可能再次遇到的非平凡问题后
- 做出重要的架构决策后
- 发现有用的模式或工作流程后
- 学习了项目特定的约定后

**记忆创建工作流程：**
1. 识别值得记住的关键信息
2. 确定合适的类别和标签
3. 创建带有正确 frontmatter 的 MEMORY.md
4. 编写清晰、可操作的内容和代码示例
5. 使用 write_file 工具保存记忆

**分类：**
- **architecture**: 架构决策、设计模式、系统结构
- **bug-fix**: Bug 修复和问题解决方案
- **workflow**: 工作流程和最佳实践
- **configuration**: 配置和环境设置
- **optimization**: 性能优化和改进

记住：记忆是帮助你变得更强大和一致的工具。有疑问时，检查是否有相关的记忆存在！
`;
```

### 实现细节

#### 类结构

```typescript
import { AgentMiddleware } from 'langchain';
import { AIMessage, SystemMessage } from '@langchain/core/messages';

interface MemoryMetadata {
    name: string;
    description: string;
    tags: string[];
    category: string;
    priority: string;
    path: string; // 绝对路径
    source: 'user' | 'project';
}

export class MemoriesMiddleware implements AgentMiddleware {
    name = 'MemoriesMiddleware';
    stateSchema = undefined;
    contextSchema = undefined;
    tools = [];

    private userMemoriesDir?: string;
    private projectMemoriesDir?: string;
    private assistantId?: string;

    constructor(
        options: {
            userMemoriesDir?: string;
            projectMemoriesDir?: string;
            assistantId?: string;
        } = {},
    ) {
        this.userMemoriesDir = options.userMemoriesDir;
        this.projectMemoriesDir = options.projectMemoriesDir || './.deepagents/memories';
        this.assistantId = options.assistantId;
    }

    async wrapModelCall(request: any, handler: any): Promise<AIMessage> {
        // 扫描和解析记忆文件
        const memoriesMetadata = this.listMemories();

        // 格式化记忆列表
        const memoriesList = this.formatMemoriesList(memoriesMetadata);
        const memoriesLocations = this.formatMemoriesLocations();

        // 注入到系统提示
        const memoriesSection = MEMORIES_SYSTEM_PROMPT.replace('{memories_locations}', memoriesLocations).replace(
            '{memories_list}',
            memoriesList,
        );

        const newSystemPrompt = request.systemPrompt
            ? request.systemPrompt + '\n\n' + memoriesSection
            : memoriesSection;

        const newSystemMessage = new SystemMessage(newSystemPrompt);
        const modifiedRequest = {
            ...request,
            systemMessage: newSystemMessage,
        };

        return await handler(modifiedRequest);
    }

    private listMemories(): MemoryMetadata[] {
        // 扫描目录，解析所有 MEMORY.md 文件
        // 复用 skills/load.ts 的逻辑
        // ...
    }

    private formatMemoriesList(memories: MemoryMetadata[]): string {
        // 按优先级和类别组织记忆
        // ...
    }
}
```

#### 工具函数

Memory 系统不需要专门的工具，直接使用现有的 `read_file` 工具即可读取 MEMORY.md 内容。

### 与现有 Memory Middleware 的关系

项目已有一个 `MemoryMiddleware`（在 `agents/code/middlewares/memory.ts`），它：

- 每 10 条消息自动总结对话
- 使用向量存储 + embeddings 进行语义检索
- 适合短期、快速检索的场景

新的 **MemoriesMiddleware** 与其互补：

| 特性     | 现有 MemoryMiddleware | 新 MemoriesMiddleware       |
| -------- | --------------------- | --------------------------- |
| 触发方式 | 自动（每 10 条消息）  | 手动（任务结束时）          |
| 存储格式 | 向量 + .md 文件       | YAML frontmatter + .md 文件 |
| 检索方式 | 语义搜索              | 元数据匹配 + 按需读取       |
| 使用场景 | 短期对话历史          | 长期知识积累                |
| 内容类型 | 对话总结              | 结构化知识、解决方案、决策  |

**集成建议**：

- 保留现有的 `MemoryMiddleware` 用于短期对话总结
- 添加新的 `MemoriesMiddleware` 用于长期知识管理
- 两者可以并存，各自服务于不同的使用场景

### 实现步骤

1. **创建 memory loader**（复用 skills/load.ts 模式）
    - `agents/code/memories/load.ts`
    - 实现 `listMemories()` 函数
    - 实现 `parseMemoryFrontmatter()` 函数

2. **创建 MemoriesMiddleware**
    - `agents/code/middlewares/memories.ts`
    - 实现 `MemoriesMiddleware` 类
    - 添加系统提示模板
    - 格式化记忆列表

3. **集成到 graph.ts**
    - 在中间件链中添加 `MemoriesMiddleware`
    - 建议在 `SkillsMiddleware` 之后

4. **测试**
    - 创建示例 MEMORY.md 文件
    - 验证元数据正确加载
    - 验证完整内容可以按需读取

## 示例使用场景

### 场景 1：记录架构决策

```markdown
---
name: 'monorepo-structure-decision'
description: '为什么选择 bun workspace 的决策'
tags: ['monorepo', 'bun', 'workspace', 'architecture']
category: 'architecture'
created: '2026-01-13'
---

# Monorepo 结构决策

## 背景

项目需要同时管理 backend 和 frontend，需要决定使用哪种 monorepo 工具。

## 决策

选择 bun workspace 作为包管理器。

## 理由

1. bun 内置 test/run/bundle，工具链统一
2. bun 安装速度更快
3. bun workspace 配置简洁
4. 原生支持 TypeScript

## 关键文件

- `package.json` - workspaces 配置
```

### 场景 2：记录 Bug 修复

```markdown
---
name: 'zod-validation-error-fix'
description: '修复 Zod schema 验证错误，添加了可选字段处理'
tags: ['bug-fix', 'zod', 'validation', 'typescript']
category: 'bug-fix'
created: '2026-01-13'
priority: 'medium'
context_scope: 'project'
---

# Zod 验证错误修复

## 问题

用户报告输入验证失败，但输入数据看起来是正确的。

## 根因

Zod schema 中某些字段被定义为必需，但实际上应该是可选的。

## 解决方案

在 schema 定义中添加 `.optional()`：

\`\`\`typescript const schema = z.object({ name: z.string(), email: z.string().optional(), // NEW: 添加 optional phone:
z.string().optional(), // NEW: 添加 optional }); \`\`\`

## 受影响的文件

- `agents/code/tools/validation/schema.ts`
```

### 场景 3：记录工作流程

```markdown
---
name: 'adding-new-tool-workflow'
description: '向项目中添加新工具的标准工作流程'
tags: ['workflow', 'tools', 'development', 'onboarding']
category: 'workflow'
created: '2026-01-13'
priority: 'high'
context_scope: 'project'
---

# 添加新工具的工作流程

## 步骤

1. 在 `tools/` 子目录创建工具文件
2. 从 `tools/index.ts` 导出
3. 在 `graph.ts` 的 `allTools` 数组中注册

## 示例

见 `agents/code/tools/my_tools/my_tool.ts`

## 注意事项

- 工具描述必须清晰说明何时使用
- 使用 Zod schema 验证输入参数
- 返回值应该清晰明确
```

## 总结

Memory System 通过复用 Skills System 的成熟模式，为 AI Agent 提供了一个简单而强大的长期知识管理方案：

✅ **渐进式披露** - 只加载元数据，完整内容按需读取 ✅ **版本控制友好** - 纯文本文件，易于版本管理 ✅
**简洁设计** - 单个 MEMORY.md 文件，无需复杂目录结构 ✅ **中文友好** - 所有内容使用中文，便于理解和维护 ✅
**与现有系统互补** - 与 MemoryMiddleware 形成完整的记忆体系

---

## 实现状态

**状态**: ✅ 已完成（2026-01-13）

### 实现的文件

1. **agents/code/memories/load.ts**
    - Memory 加载器，负责扫描和解析 MEMORY.md 文件
    - 实现 `listMemories()` 和 `_parseMemoryMetadata()` 函数
    - 支持用户级和项目级 memory 覆盖

2. **agents/code/middlewares/memories.ts**
    - MemoriesMiddleware 实现
    - 每次模型调用时自动注入 memory 元数据到系统提示
    - 按 category 和 priority 组织记忆列表

3. **agents/code/graph.ts**
    - 集成 MemoriesMiddleware 到中间件链
    - 配置项目级 memory 目录：`./.claude/memories`

4. **.claude/memories/**（示例文件）
    - `memory-system/MEMORY.md` - Memory System 使用指南
    - `monorepo-structure/MEMORY.md` - Monorepo 项目结构文档
    - `memory-system-implementation/MEMORY.md` - 实现记录

### 关键特性

- ✅ 渐进式披露：只加载元数据，完整内容按需 `read_file`
- ✅ 分类组织：5 个分类（architecture、bug-fix、workflow、configuration、optimization）
- ✅ 优先级排序：high > medium > low
- ✅ 双重存储：用户级（`~/.deepagents/{AGENT_NAME}/memories/`）+ 项目级（`.claude/memories/`）
- ✅ 中文支持：所有内容使用中文
- ✅ 类型安全：TypeScript 严格模式，无编译错误

### 中间件集成

```typescript
// agents/code/graph.ts
middleware: [
    subagents,
    new AgentsMdMiddleware(),
    new SkillsMiddleware({
        projectSkillsDir: './.claude/skills',
    }),
    new MemoriesMiddleware({
        projectMemoriesDir: './.claude/memories', // ← 新增
    }),
    mcpMiddleware,
    humanInTheLoopMiddleware({...}),
    process.env.MODEL_PROVIDER === 'anthropic' && anthropicPromptCachingMiddleware(),
]
```

### 相关文档

- [Memory System 实现记录](../.claude/memories/memory-system-implementation/MEMORY.md)
- [Memory System 使用指南](../.claude/memories/memory-system/MEMORY.md)
- [Monorepo 项目结构](../.claude/memories/monorepo-structure/MEMORY.md)

### 使用示例

Agent 启动时会自动：

1. 扫描 `.claude/memories/` 目录
2. 解析所有 MEMORY.md 的 frontmatter
3. 将元数据注入系统提示
4. 任务需要时读取完整内容

### 后续改进方向

- [ ] 性能优化：添加缓存机制，避免每次都重新扫描目录
- [ ] 索引支持：添加全文搜索索引（如 lunr.js）
- [ ] 自动分类：使用 AI 自动建议 category 和 tags
- [ ] 关联分析：自动识别相关记忆，建立链接

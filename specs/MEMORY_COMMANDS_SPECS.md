# Memory Commands 设计规范

## 概述

Memory Commands 提供智能总结和记忆提取功能，通过 `/sum` 命令一键压缩对话并自动保存有价值的知识。AI 完全自动判断哪些信息值得保存，无需任何用户干预。

## 设计目标

1. **智能总结与记忆提取**: `/sum` 命令不仅能总结对话，还能智能提取关键信息并自动保存为结构化记忆
2. **零参数设计**: 无需记忆任何参数，一键执行最优流程
3. **完全自动**: AI 自动判断哪些信息值得保存，无需用户干预
4. **真正的压缩**: 清空所有消息，只保留总结，最大化节省 token
5. **持久化知识**: 自动将关键信息保存到 Memory System，供未来检索

## 当前 `/sum` 命令的问题

### 现状分析

当前 `/summarize` 命令（别名 `/sum`, `/summary`）的实现：

```typescript
// tui/src/chat/commands/extended.ts
export const summarizeCommand: CommandDefinition = {
    name: 'summarize',
    aliases: ['sum', 'summary'],
    execute: async (args: string[], context) => {
        // 构建包含 switch_command 的 extraParams
        const summarizeExtraParams = {
            ...context.extraParams,
            switch_command: 'summarization',
        };

        await context.sendMessage([], { extraParams: summarizeExtraParams });
    }
}
```

后端处理逻辑：

```typescript
// agents/code/graph.ts
const switchBranch = {
    summarization: async (state: CodeStateType, runtime: Runtime) => {
        const message = new SystemMessage([
            new HumanMessage(getBufferMessage(state.messages)),
            new HumanMessage('请总结上面的历史记录'),
        ]);
        return {
            switch_command: '',
            messages: [new RemoveMessage({ id: REMOVE_ALL_MESSAGES }), message],
        };
    },
}
```

### 主要问题

| 问题 | 描述 | 影响 |
|------|------|------|
| **总结结果不持久化** | 总结后只保留一条消息，没有保存到 Memory System | 知识丢失，无法后续检索 |
| **清除所有历史** | `REMOVE_ALL_MESSAGES` 清空所有消息 | 丢失上下文，影响连续性 |
| **缺乏选择性** | 无法选择保留哪些关键信息 | 用户体验差 |
| **不智能** | 只是简单总结，没有提取结构化信息 | 无法生成有用的记忆 |
| **触发方式单一** | 只能通过命令行触发，AI 不能主动建议 | 缺乏智能性 |

## 设计方案

### 方案概览

```
Memory Commands Architecture

TUI Commands Layer
└── /sum           # 智能总结 + 记忆提取

LangGraph Backend
├── Switch Branches
│   ├── summarization        # 保留：简单总结
│   └── smart_memory         # 新增：智能记忆提取
└── Memory Tools
    ├── add_memory_tool      # 已存在（AI 使用）
    └── query_memory_tool    # 已存在（AI 使用）

Memory System
└── .claude/memories/        # 存储 MEMORY.md 文件
```

### 命令设计

#### 1. `/sum` - 智能总结命令（增强版）

**语法**：
```bash
/sum
```

**设计原则**：
- **零参数**：无需任何选项，一键执行
- **智能默认**：自动执行最优流程
- **完全自动**：AI 自动判断哪些信息值得保存

**默认行为**：
1. 分析对话内容
2. 智能提取关键信息
3. 自动生成并保存记忆
4. 清空所有消息（真正的压缩）
5. 生成对话总结

**设计决策**：
- **完全自动**：AI 自动判断哪些信息值得保存，无需用户干预
- **压缩全部内容**：`/sum` 的本质是"summarize"，应该清空所有消息
- **只保留总结**：压缩后只有一条总结消息，达到真正的"压缩"效果
- **零参数**：简化使用，最佳行为作为默认

**工作流程**：

```
用户输入: /sum

1. 后端分析对话内容
   ├─ 识别关键信息
   ├─ 自动判断哪些值得保存
   ├─ 生成结构化记忆
   └─ 生成总体总结

2. 自动保存记忆
   ├─ AI 判断优先级和相关性
   ├─ 只保存有价值的记忆
   └─ 写入 .claude/memories/

3. 清空所有消息
   └─ 只保留一条总结消息（真正的压缩）
```

**实现说明**：
- 无需任何选项或参数
- AI 自动判断哪些信息值得保存（基于重要性、独特性、可复用性）
- 避免保存琐碎或临时信息
- **真正的压缩**：清空所有消息，只保留一条总结，最大化节省 token

### 设计说明

**记忆管理方式**：
- **AI 完全驱动**：通过 `/sum` 命令，AI 自动提取并保存记忆
- **AI 自动查询**：AI 使用 `query_memory_tool` 自动检索记忆
- **无需手动命令**：不提供任何手动管理记忆的命令

**理由**：
1. **AI 更擅长提取**：AI 能更好地识别和结构化关键信息
2. **简化命令集**：减少用户需要学习的命令数量
3. **避免重复**：`/sum` 已能完成记忆管理，手动命令是冗余的
4. **完全自动化**：用户无需关心记忆的创建和维护
5. **符合 Zen Code 理念**：最少交互，最简命令集

## 技术实现

### 架构组件

#### 1. TUI Commands Layer

**文件**：`tui/src/chat/commands/extended.ts`（更新 `/sum` 命令）

```typescript
export const summarizeCommand: CommandDefinition = {
    name: 'summarize',
    description: '智能总结对话并提取记忆',
    aliases: ['sum', 'summary'],
    execute: async (args: string[], context) => {
        // 构建请求 - 无需参数解析
        const summarizeExtraParams = {
            ...context.extraParams,
            switch_command: 'smart_memory',
        };

        await context.sendMessage([], {
            extraParams: summarizeExtraParams
        });

        return {
            success: true,
            message: '正在分析对话，稍后将展示候选记忆...',
            shouldClearInput: true,
        };
    },
};
```

#### 2. LangGraph Switch Branches

**文件**：`agents/code/graph.ts`

```typescript
const switchBranch = {
    // 保留：简单总结（向后兼容）
    summarization: async (state: CodeStateType, runtime: Runtime) => {
        // ... 现有逻辑
    },

    // 新增：智能记忆提取
    smart_memory: async (state: CodeStateType, runtime: Runtime) => {
        const { messages } = state;

        // 1. 提取对话内容
        const conversation = getBufferMessage(messages);

        // 2. 调用 AI 分析，自动判断并保存值得记忆的内容
        const model = await initChatModel(state.main_model);
        const result = await analyzeAndSaveMemories(model, conversation);

        // 3. 清空所有消息，只保留总结
        const summaryMessage = new SystemMessage([
            new HumanMessage(`对话总结：\n${result.summary}`),
            new SystemMessage(`已保存 ${result.savedCount} 条记忆到 Memory System`),
        ]);

        return {
            switch_command: '',
            messages: [
                new RemoveMessage({ id: REMOVE_ALL_MESSAGES }),
                summaryMessage,
            ],
        };
    },
    memory_selection: async (state: CodeStateType, runtime: Runtime) => {
        const { memory_candidates, summary } = state;

        // 用户选择后，保存选中的记忆
        const saved = await Promise.all(
            memory_candidates
                .filter(candidate => candidate.selected) // 用户选择的记忆
                .map(candidate => saveMemory(candidate))
        );

        // 生成总结消息
        const summaryMessage = new SystemMessage([
            new HumanMessage(`对话总结：\n${summary}`),
            new SystemMessage(`已保存 ${saved.length} 条记忆到 Memory System`),
        ]);

        // 清空所有消息，只保留总结（真正的压缩）
        return {
            switch_command: '',
            messages: [
                new RemoveMessage({ id: REMOVE_ALL_MESSAGES }),
                summaryMessage,
            ],
        };
    },
}
```

#### 3. 对话分析器

**文件**：`agents/code/utils/analyze_conversation.ts`

```typescript
export interface MemoryCandidate {
    name: string;
    description: string;
    category: 'architecture' | 'bug-fix' | 'workflow' | 'configuration' | 'optimization';
    tags: string[];
    priority: 'high' | 'medium' | 'low';
    content: string;
}

export async function analyzeAndSaveMemories(
    model: BaseChatModel,
    conversation: string
): Promise<{
    savedCount: number;
    summary: string;
}> {
    // 使用结构化输出分析对话并判断哪些值得保存
    const structuredLimiter = model.withStructuredOutput({
        shouldSave: z.boolean(),
        memories: z.array(MemoryCandidateSchema),
        summary: z.string(),
    });

    const prompt = `
分析以下对话，判断并提取值得保存的信息：

对话内容：
${conversation}

你的任务：
1. 判断对话中是否有值得保存的信息（架构决策、Bug修复、最佳实践等）
2. 如果有，提取这些信息并生成结构化记忆
3. 如果信息琐碎、临时或无长期价值，则不保存

判断标准：
- **重要性**：是否对未来的工作有参考价值？
- **独特性**：是否是非常规知识，不是显而易见的？
- **可复用性**：是否可能在其他场景中用到？
- **持久性**：是否是临时信息（如"今天天气好"）？

对每个值得保存的信息：
- 生成 kebab-case 的名称
- 写简短描述
- 分类到合适的 category
- 添加相关 tags
- 评估优先级
- 编写完整的 Markdown 内容

最后生成总体总结。

输出格式：
- shouldSave: 是否有任何值得保存的记忆
- memories: 值得保存的记忆数组（如果 shouldSave=false，则为空数组）
- summary: 对话总结
`;

    const result = await structuredLimiter.invoke([new HumanMessage(prompt]);

    // 自动保存值得保存的记忆
    if (result.shouldSave && result.memories.length > 0) {
        await Promise.all(
            result.memories.map(memory => saveMemory(memory))
        );
        return {
            savedCount: result.memories.length,
            summary: result.summary,
        };
    }

    return {
        savedCount: 0,
        summary: result.summary,
    };
}
```

#### 4. 记忆保存器

**文件**：`agents/code/utils/save_memory.ts`

```typescript
export async function saveMemory(candidate: MemoryCandidate): Promise<string> {
    const memoriesDir = path.join(process.cwd(), '.claude/memories', candidate.name);
    const memoryFile = path.join(memoriesDir, 'MEMORY.md');

    // 创建目录
    await fs.mkdir(memoriesDir, { recursive: true });

    // 生成 YAML frontmatter
    const frontmatter = {
        name: candidate.name,
        description: candidate.description,
        tags: candidate.tags,
        category: candidate.category,
        created: new Date().toISOString().split('T')[0],
        last_updated: new Date().toISOString().split('T')[0],
        priority: candidate.priority,
    };

    // 写入文件
    const content = `---
${yaml.stringify(frontmatter)}---
${candidate.content}
`;

    await fs.writeFile(memoryFile, content, 'utf-8');

    // 刷新 MemoriesMiddleware 缓存
    // TODO: 实现缓存刷新机制

    return memoryFile;
}
```

### State Schema 扩展

**文件**：`agents/code/state.ts`

```typescript
export const CodeState = Annotation({
    // ... 现有字段

    // 修改：switch_command 类型扩展
    switch_command: Annotation<'summarization' | 'smart_memory' | ''>({
        default: () => '',
        reducer: (_, update) => update,
    }),
});
```

### 命令路由增强

**文件**：`tui/src/chat/commands/extended.ts`

```typescript
export const summarizeCommand: CommandDefinition = {
    name: 'summarize',
    description: '智能总结对话并提取记忆',
    aliases: ['sum', 'summary'],
    execute: async (args: string[], context) => {
        // 构建请求 - 无需参数解析
        const summarizeExtraParams = {
            ...context.extraParams,
            switch_command: 'smart_memory',
        };

        await context.sendMessage([], {
            extraParams: summarizeExtraParams
        });

        return {
            success: true,
            message: '正在分析对话，稍后将展示候选记忆...',
            shouldClearInput: true,
        };
    },
};
```

## 用户交互流程

### 唯一流程：一键智能总结

```
用户: /sum

TUI: 正在分析对话并提取记忆...

[后端完全自动处理]
1. 提取对话历史
2. AI 自动判断哪些信息值得保存
3. 自动生成结构化记忆
4. 自动保存到 .claude/memories/
5. 清空所有消息，只保留总结

TUI: ✓ 已保存 2 条记忆到 Memory System

    1. memory-system-implementation
       [architecture] Memory System 完整实现流程

    2. typescript-index-fix
       [bug-fix] 修复 TypeScript 索引类型错误

    对话总结：
    本次对话完成了 Memory System 的实现，
    包括加载器、中间件和集成...

    已清空所有历史消息，只保留总结（节省 85% token）
```

**关键特性**：
- ✅ 完全自动，无需用户选择
- ✅ AI 智能判断信息价值
- ✅ 避免保存琐碎内容
- ✅ 真正的消息压缩

## 后续改进方向

1. **AI 自动建议**: AI 在对话中主动建议保存关键信息
2. **记忆链接**: 支持记忆之间的引用关系
3. **版本管理**: 支持记忆的历史版本和回滚
4. **智能去重**: 检测重复记忆，合并或更新
5. **记忆图谱**: 构建记忆之间的关联图谱
6. **云端同步**: 支持跨设备记忆同步
7. **权限管理**: 区分项目级和用户级记忆的访问权限

## 设计对比

### 简化前 vs 简化后

| 特性 | 简化前 | 简化后 |
|------|--------|--------|
| **命令语法** | `/sum [--save] [--tags X] [--keep N] [--auto] [--interactive]` | `/sum` |
| **参数数量** | 5 个可选参数 | 0 个参数 |
| **默认行为** | 简单总结，不清空 | 智能提取，**完全自动**，**清空全部** |
| **交互模式** | 需要显式指定 `--interactive` | **无需交互**，AI 自动判断 |
| **记忆提取** | 需要显式指定 `--auto` | 总是自动提取并保存 |
| **消息保留** | 保留全部历史 | **清空全部，只保留总结** |
| **用户控制** | 低（需要了解所有参数） | 零（AI 完全自动） |

### 为什么简化？

1. **降低学习成本**：用户无需记忆任何参数
2. **提升使用体验**：一键执行，自动完成所有智能操作
3. **减少决策疲劳**：AI 自动判断，无需用户思考
4. **符合 Zen Code 理念**：直接、高效、零交互
5. **真正的压缩**：清空所有消息，只保留总结，最大化节省 token
6. **AI 更擅长**：机器比人更擅长判断信息价值

## 实现状态

**状态**: 📝 规划中

### 待实现

- [ ] 更新 `/sum` 命令（简化版，无参数）
- [ ] LangGraph Switch Branches（`smart_memory`）
- [ ] 对话分析器（`analyzeAndSaveMemories`）
- [ ] 记忆保存器（`saveMemory`）
- [ ] 缓存刷新机制（保存后更新 MemoriesMiddleware）
- [ ] 使用 `REMOVE_ALL_MESSAGES` 实现真正的消息压缩
- [ ] AI 智能判断逻辑（评估信息价值）

### 已有基础

- [x] Memory System (MemoriesMiddleware, memories/load.ts)
- [x] Memory Tools (add_memory_tool, query_memory_tool)
- [x] 简单的 `/sum` 命令（需要增强）
- [x] YAML frontmatter 格式定义

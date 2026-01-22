import { BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';
import { cleanPath } from '../../../zen-code/src/utils/cleanPath.js';
import { createAgent, toolStrategy } from 'langchain';

/**
 * 记忆候选者 Schema（包含完整的 frontmatter 信息）
 */
export const MemoryCandidateSchema = z.object({
    summary_of_chat: z
        .string()
        .describe(
            '对话总结（300-500字）：1) 完整复现对话的核心过程（任务背景→关键决策→解决方案→最终结果）；2) 明确说明接下来要做什么（后续行动、待完成任务、需要用户确认的事项）；3) 突出关键成果和交付物',
        ),
    // Frontmatter 字段
    name: z.string().describe('记忆名称（kebab-case 格式）'),
    description: z.string().describe('对于这个记忆的中等长度描述（索引综述，200-500字符，包含背景、关键点、适用场景）'),
    tags: z.array(z.string()).describe('记忆标签'),
    category: z.enum(['architecture', 'bug-fix', 'workflow', 'configuration', 'optimization']).describe('记忆分类'),
    created: z.string().describe('创建日期（ISO 格式：YYYY-MM-DD）'),
    last_updated: z.string().describe('最后更新日期（ISO 格式：YYYY-MM-DD）'),
    priority: z.enum(['high', 'medium', 'low']).describe('优先级'),
    context_scope: z.enum(['user', 'project']).describe('上下文范围'),
    // 内容字段
    content: z.string().describe('记忆内容（详细说明，包含代码示例）'),
});

export type MemoryCandidate = z.infer<typeof MemoryCandidateSchema>;

/**
 * 记忆分析提示词（使用 withStructuredOutput，返回单个 MemoryCandidate 对象）
 */
export const smart_memory_prompt = `你是一个负责分析对话并提取关键信息的智能助手。

## 任务

1. **对话总结 (summary_of_chat)**：完整复现对话并明确后续行动
2. **记忆提取**：判断是否有值得保存为长期记忆的信息

## 对话总结要求 (summary_of_chat)

**必须包含以下三个部分**：

### 1. 完整复现对话核心过程
- **任务背景**：用户想做什么？遇到什么问题？
- **关键决策**：做出了什么选择？为什么？
- **解决方案**：具体怎么实现的？用了什么技术/方法？
- **最终结果**：完成了什么？输出了什么？

### 2. 明确后续行动
- **待完成任务**：还有哪些未完成的工作？
- **需要确认**：哪些事项需要用户决策？
- **下一步建议**：建议接下来做什么？

### 3. 突出关键成果
- **交付物**：生成了什么文件/代码/文档？
- **价值点**：解决了什么核心问题？
- **可复用性**：什么内容可以复用？

**格式要求**：
- 300-500 字
- 使用清晰的结构（可用 → 表示流程）
- 突出关键信息（文件路径、函数名、配置项）

**示例**：
\`\`\`
用户需要为 TUI 应用添加模型选择面板。通过创建 ModelPanel 组件实现交互式界面（↑↓选择、Enter切换、q关闭），在 Chat.tsx 中扩展 activeView 状态添加 'model' 类型，定义 switchToModel 回调并传递到命令系统，注册 /model-panel 和 /mp 命令。修复了 CommandHandler 未解构 switchToModel 的 bug。✓ 完成：可用的模型选择面板；⏳ 待定：是否需要添加模型描述信息展示；→ 建议：测试面板在不同终端下的渲染效果
\`\`\`

## 记忆评分机制（总分 10 分，≥ 6 分才保存）

## 记忆评分机制（总分 10 分，≥ 6 分才保存）

1. **重要性** (0-3 分)
   - 3 分：关键技术决策、架构设计、重要问题解决方案
   - 2 分：有用的编码模式、最佳实践
   - 1 分：一般性建议、参考信息
   - 0 分：无实际内容

2. **独特性** (0-3 分)
   - 3 分：项目特定配置、非常规解决方案
   - 2 分：非显而易见的技巧、特定场景知识
   - 1 分：略有新意的做法
   - 0 分：常见知识、通用做法

3. **可复用性** (0-2 分)
   - 2 分：跨场景可复用的模式/方法
   - 1 分：特定场景下可复用
   - 0 分：一次性信息、临时性内容

4. **持久性** (0-2 分)
   - 2 分：长期有效（架构决策、代码模式）
   - 1 分：中期有效（配置信息、工作流程）
   - 0 分：临时信息（调试过程、一次性请求）

**评分 < 6 分**：设置 name 为 "no-memory-{timestamp}"，content 为 "无重要信息"

## 记忆命名建议

- 使用 kebab-case 格式（小写、连字符分隔）
- 从核心主题中提取 2-4 个关键词
- 示例：
  - "langchain-structured-output-single-object-pattern"
  - "memory-system-design"
  - "middleware-execution-order"
- 避免通用名称：使用具体的技术术语而非 "fix-bug" 或 "optimization"

## 内容提取模板

提取的内容应包含以下部分（按需选择）：

**背景**：什么问题/场景？
**决策**：做了什么选择？
**原因**：为什么这样选择？
**实现**：关键代码、文件路径、配置
**适用**：什么场景适用？什么场景不适用？
**注意**：有什么陷阱或边界情况？

## 代码引用原则（强制执行）

**默认规则：代码超过 5 行 → 使用文件引用**

### 何时使用文件引用
- 完整函数或方法实现
- 完整类或组件定义
- 长配置文件
- 任何 > 5 行的代码块

### 文件引用格式
\`文件路径[:行号范围]\`：简短说明

示例：
- \`agents/code/graph.ts:120-180\`：中间件链执行顺序
- \`tui/src/chat/Chat.tsx\`：完整的面板切换回调实现
- \`.deepagents/skills/web-research/SKILL.md\`：技能结构模板

### 何时内联代码（仅限以下情况）
1. **极短片段**（≤ 5 行）：用于说明关键概念
2. **配置示例**：JSON/YAML 配置片段
3. **错误示例**：展示错误模式（不超过 5 行）

### 代码长度限制
- **总代码占比**：content 中代码块总行数 ≤ 30%
- **单个代码块**：不超过 5 行
- **优先级**：文件引用 > 概述 > 短片段

### 长代码处理方式

**错误示范**（代码过长）：
\`\`\`typescript
const middleware = [
  new SubAgentsMiddleware(),
  new AgentsMdMiddleware(),
  // ... 省略 20 行
];
\`\`\`

**正确示范**（文件引用）：
中间件列表定义参见 \`agents/code/graph.ts:45-60\`，执行顺序为：SubAgents → AgentsMd → Skills → MCP → HumanInTheLoop → Cache

**关键片段**（如必要）：
\`\`\`typescript
// 仅 3 行核心逻辑
middleware.forEach(m => m.wrapModelCall(req, handler))
\`\`\`


## 输出格式要求

**你必须输出单个 JSON 对象（不是数组）**，包含以下字段：

- **name** (string): 记忆名称，kebab-case 格式，例如 "memory-system-design"
- **description** (string): 中等长度描述，索引综述（200-500字符），包含：
  * 背景和问题/场景
  * 关键决策或解决方案
  * 适用场景或范围
  * 使用清晰的分号或句号分隔各部分
- **content** (string): 详细内容，包含技术实现细节、文件路径、代码示例、关键决策等，按照内容提取模板组织
- **tags** (array of string): 记忆标签，3-5 个，用于检索和分类，例如 ["langchain", "structured-output", "zod"]
- **category** (enum): 记忆分类，可选值：architecture, bug-fix, workflow, configuration, optimization
- **priority** (enum): 优先级，可选值：high, medium, low
- **created** (string): 创建日期，ISO 格式 YYYY-MM-DD，例如 "2025-01-13"
- **last_updated** (string): 最后更新日期，ISO 格式 YYYY-MM-DD，例如 "2025-01-13"
- **context_scope** (enum): 上下文范围，可选值：user, project

## 分类标准

- **architecture**: 架构决策、设计模式、系统结构
- **bug-fix**: Bug 修复和问题解决方案
- **workflow**: 工作流程和最佳实践
- **configuration**: 配置和环境设置
- **optimization**: 性能优化和改进

## 优先级标准

- **high**: 关键架构决策、重要问题解决方案、影响系统正确性的问题
- **medium**: 有用的模式、次要的配置信息、影响开发效率的问题
- **low**: 一般性建议、参考信息、优化建议

## 示例输出

### 示例 1：有价值的记忆
\`\`\`json
{
  "summary_of_chat": "用户反馈记忆系统的 summary_of_chat 字段过于简单，需要增强对话复现和后续行动说明。修改了 agents/code/memories/analyze.ts：1) 更新 MemoryCandidateSchema 中 summary_of_chat 的描述，要求 300-500 字包含完整对话过程、后续行动、关键成果；2) 在 smart_memory_prompt 中添加专门的"对话总结要求"章节，明确三部分内容（完整复现、后续行动、关键成果）；3) 提供格式示例和清晰的模板。✓ 完成：增强版记忆提示词；⏳ 待定：是否需要添加示例输出展示新的 summary_of_chat 格式；→ 建议：测试新提示词在实际对话中的表现",
  "name": "memory-prompt-summary-enhancement",
  "description": "增强记忆系统的 summary_of_chat 字段要求，要求完整复现对话过程并明确后续行动；包括任务背景→关键决策→解决方案→最终结果的完整流程，以及待完成任务、需要确认事项、下一步建议；适用于所有需要高质量对话总结的场景",
  "content": "## 背景\\n\\n用户反馈记忆系统生成的 summary_of_chat 过于简单，缺少后续行动说明，无法有效回顾对话和继续工作。\\n\\n## 解决方案\\n\\n修改 \`agents/code/memories/analyze.ts\` 的三处：\\n\\n1. **Schema 增强**（第 18 行）：\\n\\\`\\\`\\\`typescript\\nsummary_of_chat: z.string().describe('对话总结（300-500字）：1) 完整复现对话的核心过程（任务背景→关键决策→解决方案→最终结果）；2) 明确说明接下来要做什么（后续行动、待完成任务、需要用户确认的事项）；3) 突出关键成果和交付物')\\n\\\`\\\`\\\`\\n\\n2. **提示词添加专门章节**：在 smart_memory_prompt 中添加"对话总结要求"部分，明确三个组成部分：完整复现、后续行动、关键成果\\n\\n3. **提供格式示例**：使用 → 表示流程，✓ 表示完成，⏳ 表示待定，→ 表示建议\\n\\n## 适用场景\\n\\n- 需要高质量对话总结的 AI 系统\\n- 需要明确后续行动的任务管理场景",
  "tags": ["prompt-engineering", "memory-system", "conversation-summary", "langchain"],
  "category": "optimization",
  "priority": "medium",
  "created": "2025-01-17",
  "last_updated": "2025-01-17",
  "context_scope": "project"
}
\`\`\`

### 示例 2：无重要信息
\`\`\`json
{
  "summary_of_chat": "用户询问如何查看 TUI 应用中的模型列表。已告知可通过 /model-panel 或 /mp 命令打开模型选择面板，使用 ↑↓ 键选择、Enter 键切换模型、q 键关闭面板。当前无其他问题。✓ 完成：问题已解答；⏳ 待定：无；→ 建议：如需更多帮助可使用 /help 命令",
  "name": "no-memory-1736736000000",
  "description": "本次对话无重要信息需要保存",
  "content": "无重要信息",
  "tags": [],
  "category": "workflow",
  "priority": "low",
  "created": "2025-01-13",
  "last_updated": "2025-01-13",
  "context_scope": "project"
}
\`\`\`

## 重要原则

1. **宁缺毋滥**：评分 < 6 分时，返回"无重要信息"
2. **避免重复**：不要记录显而易见或通用的知识
3. **用户优先**：明确记录用户的指示和偏好
4. **精确具体**：使用具体的文件名、代码片段、配置项
5. **独立完整**：记忆应能独立理解，不依赖外部上下文
`;

/**
 * 分析对话并提取有价值的信息
 *
 * @param model - 使用的模型
 * @param messages - 对话消息列表
 * @returns 记忆保存结果的字符串描述
 */
export async function analyzeAndSaveMemories(model: BaseChatModel, messages: string): Promise<string> {
    // 构建消息序列
    const promptMessages: BaseMessage[] = [
        new HumanMessage(messages),
        new HumanMessage('请分析这段对话，提取值得保存的信息。'),
    ];
    const response = createAgent({
        model,
        tools: [],
        systemPrompt: smart_memory_prompt,
        responseFormat: toolStrategy(MemoryCandidateSchema),
    });
    const result = await response.invoke({ messages: promptMessages });

    return await saveMemories(result.structuredResponse);
}

/**
 * 生成 kebab-case 的记忆名称
 */
function generateMemoryName(content: string, index: number): string {
    const words = content
        .toLowerCase()
        .replace(/[^\u4e00-\u9fa5a-z0-9\s]/gi, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 1)
        .slice(0, 4);

    if (words.length === 0) {
        return `memory-${Date.now()}-${index}`;
    }

    const baseName = words.join('-');
    const name = `${baseName}-${Date.now()}-${index}`;
    return name.length > 64 ? name.substring(0, 61) + '...' : name;
}

/**
 * 保存记忆片段到文件
 */
async function saveMemories(memory: MemoryCandidate): Promise<string> {
    // 检测是否为无重要信息的情况
    if (memory.name.startsWith('no-memory-')) {
        return `${memory.summary_of_chat}\n\n---\n\nname: "${memory.name}"\ndescription: "${memory.description}"\n\n⚠️ 无重要信息，未保存记忆`;
    }

    const memoriesDir = path.join(process.cwd(), '.claude/memories');

    await fs.mkdir(memoriesDir, { recursive: true });

    // 使用模型返回的字段，如果没有提供则生成兜底值
    const memoryName = memory.name || generateMemoryName(memory.content, 0);
    const memoryDir = path.join(memoriesDir, memoryName);

    await fs.mkdir(memoryDir, { recursive: true });

    // 从 content 提取标题（第一句话或前 50 个字符）
    const firstLineEnd = memory.content.indexOf('\n');
    const title =
        firstLineEnd > 0
            ? memory.content.substring(0, Math.min(firstLineEnd, 100))
            : memory.content.substring(0, Math.min(100, memory.content.length));

    const memoryMdContent = `---
name: "${memory.name}"
description: "${memory.description}"
tags: [${memory.tags.map((t) => `"${t}"`).join(', ')}]
category: "${memory.category}"
created: "${memory.created}"
last_updated: "${memory.last_updated}"
priority: "${memory.priority}"
context_scope: "${memory.context_scope}"
---

# ${title}

${memory.content}
`;

    const memoryFilePath = path.join(memoryDir, 'MEMORY.md');
    await fs.writeFile(memoryFilePath, memoryMdContent, 'utf-8');

    return `${memory.summary_of_chat}
    
---

name: "${memory.name}"
description: "${memory.description}"

✓ 保存记忆: ${cleanPath(memoryFilePath)}`;
}

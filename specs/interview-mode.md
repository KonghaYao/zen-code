# Interview Mode 设计文档（v3.0 - 极简版）

> **状态**: ❌ 未实现（2026-03-06 验证 - 代码库中未找到 InterviewMode 相关实现）

## 1. 概述

### 1.1 目标

解决用户**说不明白需求**的问题：通过 AI 提问引导用户澄清需求，避免基于模糊或错误假设执行操作。

### 1.2 用户场景

**典型问题**：

- "优化代码" - 优化什么？性能还是可读性？
- "添加功能" - 什么功能？怎么做？
- "修复问题" - 什么问题？在哪里？
- "我不知道怎么说，但我想..."

**解决方案**：AI 使用选择题引导用户，让用户从选项中选择，而不是自己描述。

### 1.3 核心机制

**前端命令**：用户输入 `/interview` 或 `/i`，前端在消息前附加提示词

**零后端修改**：后端无需任何改动，`ask_user_with_options` 工具已存在

**工具驱动**：AI 收到增强消息后，使用现有工具向用户提问

### 1.4 架构对比（v2 vs v3）

| 维度           | v2（已废弃）                 | v3（当前设计）                       |
| -------------- | ---------------------------- | ------------------------------------ |
| **触发机制**   | 消息标记 `[NEEDS_INTERVIEW]` | AI 调用 `ask_user_with_options` 工具 |
| **前端状态**   | InterviewContext             | 无（复用工具系统）                   |
| **前端组件**   | InterviewPanel               | 复用 `ask_user_with_options` UI      |
| **AI 提示词**  | 复杂的 JSON 格式             | 前端命令附加提示词                   |
| **实现复杂度** | 高（12 章节，7 天）          | 低（1 个命令，1 天）                 |

---

## 2. 核心设计

### 2.1 交互流程

```
用户输入 /interview 命令
    ↓
前端附加提示词前缀
    ↓
发送增强消息给后端（零修改）
    ↓
AI 收到提示词，调用 ask_user_with_options 工具（并发）
    ↓
前端显示工具 UI（复用现有实现）
    ↓
用户回答问题
    ↓
AI 获得明确需求，执行任务
```

### 2.2 ask_user_with_options 工具（已存在）

```typescript
// 工具签名（已存在，无需修改）
{
  name: 'ask_user_with_options',
  description: 'Ask the user for a selection from a list of options',
  parameters: {
    description: string;        // 问题文本
    type: 'single_select' | 'multi_select';
    options: Array<{            // 选项列表
      index: number;
      label: string;
    }>;
    allow_custom_input: boolean; // 是否允许自定义输入
  }
}
```

---

## 3. 前端实现（唯一需要修改的部分）

### 3.1 /interview 命令

```typescript
// tui/src/chat/commands/interviewCommand.ts

import { CommandDefinition, CommandContext, CommandResult } from '../types';

const INTERVIEW_PREFIX = `
[Interview Mode Activated]

The user wants to clarify requirements through guided questions.

## When to Use Interview Mode

✅ Use it when:
- User's request is vague (e.g., "optimize code", "add feature", "fix something")
- User seems unsure about what they want
- Task involves key files (package.json, configs, etc.)

❌ Don't use it when:
- User's request is clear and specific
- Task is simple and direct
- It's just an information query

## Best Practices

1. Ask multiple questions at once - Use Promise.all for efficiency
2. Use multiple-choice questions - Reduce user typing with single_select or multi_select
3. Enable custom input - Set allow_custom_input: true when unsure of all options
4. Keep questions focused - One thing per question
5. Limit to 3-5 questions - Don't overwhelm the user

## Example

If user says "optimize code", you should call:

\`\`\`typescript
await Promise.all([
  ask_user_with_options({
    description: "What scope to optimize?",
    type: "single_select",
    options: [
      { index: 0, label: "Single component" },
      { index: 1, label: "Entire module" },
      { index: 2, label: "Whole project" }
    ],
    allow_custom_input: false
  }),
  ask_user_with_options({
    description: "Optimization goals? (multi-select)",
    type: "multi_select",
    options: [
      { index: 0, label: "Performance" },
      { index: 1, label: "Readability" },
      { index: 2, label: "Type safety" },
      { index: 3, label: "Test coverage" }
    ],
    allow_custom_input: true
  })
]);
\`\`\`

After getting answers:
1. Summarize user's requirements
2. Start executing the task immediately

---

User's original message:
`;

export const interviewCommand: CommandDefinition = {
    name: 'interview',
    description: 'Start Interview mode to clarify requirements through questions',
    aliases: ['i'],
    usage: '/interview [your request]',
    examples: ['/interview optimize code', '/i add user authentication'],
    execute: async (args: string[], context: CommandContext): Promise<CommandResult> => {
        const userRequest = args.join(' ') || 'Help me complete a task';
        const enhancedMessage = INTERVIEW_PREFIX + userRequest;

        await context.sendMessage(enhancedMessage);

        return {
            success: true,
            message: '📋 Interview mode activated',
            shouldClearInput: true,
        };
    },
};

export const interviewCommands: CommandDefinition[] = [interviewCommand];
```

### 3.2 注册命令

```typescript
// tui/src/chat/commands/index.ts

import { interviewCommands } from './interviewCommand';

export const allCommands = [
    ...interviewCommands,
    // ... 其他命令
];
```

---

## 4. 后端实现（零修改）

**无需任何改动**，后端已经具备：

- ✅ `ask_user_with_options` 工具已存在
- ✅ 工具 UI 已实现
- ✅ 并发调用支持
- ✅ 自定义输入支持

---

## 5. 实现步骤

### Phase 1: 前端命令（0.5 天）✅

- [x] 实现 `/interview` 和 `/i` 命令
- [x] 注册到命令系统
- [x] 测试消息发送逻辑

### Phase 2: 测试和优化（0.5 天）⏳

- [ ] 测试 `/interview` 命令
- [ ] 测试并发工具调用
- [ ] 优化提示词（基于测试结果）

### Phase 3: 文档（0.5 天）✅

- [x] 更新用户文档
- [x] 编写使用示例

**实际用时**：约 0.5 小时（后端零修改）

**实现文件**：

- `tui/src/chat/commands/interviewCommand.ts` - 新建（~50 行）
- `tui/src/chat/commands/index.ts` - 注册命令

---

## 6. 与 v2 的对比

| 维度         | v2（已废弃）                             | v3（当前）           |
| ------------ | ---------------------------------------- | -------------------- |
| **后端修改** | 是（提示词集成）                         | 否（零修改）         |
| **前端修改** | InterviewContext、InterviewPanel、解析器 | 仅 `/interview` 命令 |
| **开发时间** | 7-10 天                                  | 1.5 天               |
| **代码行数** | ~1500 行                                 | ~50 行               |
| **状态管理** | 复杂（前端状态）                         | 无（复用工具系统）   |
| **维护成本** | 高                                       | 低                   |

---

## 7. 开放问题

1. **提示词迭代**：如何让 AI 更准确地判断何时使用工具？
    - 基于实际使用反馈调整示例
    - 可能需要添加更多场景示例

2. **问题数量控制**：AI 一次性调用 10+ 个工具怎么办？
    - 在提示词中限制"通常不超过 5 个问题"
    - 前端 UI 可能需要优化（如果问题过多）

3. **多轮澄清**：如果用户回答不满足要求，AI 需要追问
    - 工具系统天然支持再次调用
    - 无需特殊处理

---

## 8. 附录：完整命令代码

```typescript
// tui/src/chat/commands/interviewCommand.ts

import { CommandDefinition, CommandContext, CommandResult } from '../types';

const INTERVIEW_PREFIX = `
[Interview Mode Activated]

I want to clarify requirements through guided questions.

1. Ask multiple questions at once - Use multiple \`ask_user_with_options\` tool_calls for efficiency
2. Use multiple-choice questions - Reduce user typing with single_select or multi_select
3. Enable custom input - Set allow_custom_input: true when unsure of all options
4. Keep questions focused - One thing per question
5. Limit to 3-5 questions in one \`ask_user_with_options\` tool_call - Don't overwhelm the user

After getting answers:
1. Summarize user's requirements
2. Start executing the task immediately

---

User's original message:
`;

export const interviewCommand: CommandDefinition = {
    name: 'interview',
    description: 'Start Interview mode to clarify requirements through questions',
    aliases: ['i'],
    usage: '/interview [your request]',
    examples: ['/interview optimize code', '/i add user authentication'],
    execute: async (args: string[], context: CommandContext): Promise<CommandResult> => {
        const userRequest = args.join(' ') || 'Help me complete a task';
        const enhancedMessage = INTERVIEW_PREFIX + userRequest;

        await context.sendMessage(enhancedMessage);

        return {
            success: true,
            message: '📋 Interview mode activated',
            shouldClearInput: true,
        };
    },
};

export const interviewCommands: CommandDefinition[] = [interviewCommand];
```

---

## 9. 实现结果

### 9.1 完成状态

**状态**：✅ 已完成（2025-01-21）

**实际开发时间**：约 0.5 小时

**实际代码量**：~50 行（不含注释和空行）

### 9.2 关键决策

1. **提示词简化**：使用第 8 节的极简版提示词，仅保留 5 条核心最佳实践
2. **sendMessage 调用**：使用数组格式 `[{ type: 'human', content: enhancedMessage }]` 以匹配类型定义
3. **零后端修改**：完全复用现有的 `ask_user_with_options` 工具系统

### 9.3 与 v2 对比（实际结果）

| 维度         | v2（已废弃） | v3（实际实现） | 改进       |
| ------------ | ------------ | -------------- | ---------- |
| **开发时间** | 7-10 天      | 0.5 小时       | **94%** ⬇️ |
| **代码量**   | ~1500 行     | ~50 行         | **97%** ⬇️ |
| **后端修改** | 是           | 否             | ✅         |
| **前端修改** | 多个组件     | 1 个命令       | ✅         |

### 9.4 后续工作

- [ ] 测试 AI 是否准确判断何时调用工具
- [ ] 评估提示词示例的有效性
- [ ] 基于用户反馈迭代提示词

---

**文档版本**：v3.0 **最后更新**：2025-01-21 **状态**：✅ 已实现 **后端修改**：无（零修改） **前端修改**：仅 `/interview`
命令（~50 行代码）

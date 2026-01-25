---
name: "command-system-architecture"
description: "命令系统完整架构：包含三种核心模式（前缀模式、多消息模式、紧凑消息模式）、参数验证机制、命令注册系统。适用于需要特殊行为模式、复杂上下文提供或紧凑显示的命令实现。"
tags: ["command-system", "prefix-mode", "multi-message", "compact-mode", "tui", "parameter-validation", "interview", "plan", "architecture-pattern"]
category: "architecture"
created: "2025-01-25"
last_updated: "2025-01-25"
priority: "high"
context_scope: "project"
---

# 命令系统完整架构

## 概述

命令系统提供三种核心模式来实现不同类型的交互需求：
1. **前缀模式** - 通过提示词前缀激活特殊行为模式
2. **多消息模式** - 将复杂提示词拆分为多个独立 message
3. **紧凑消息模式** - TUI 应用的紧凑消息显示

---

## 一、前缀模式（Prefix Mode）

### 核心思想

在用户消息前添加特定前缀（如 `INTERVIEW_PREFIX`、`PLAN_PREFIX`）来激活特殊模式，复用默认 agent 的所有工具和能力，无需修改后端。

### 实现模式

**1. 命令定义**（`zen-code/src/chat/commands/planCommand.ts`）

```typescript
const PLAN_PREFIX = `
[Plan Mode Activated]

I want to create a comprehensive implementation plan for this task.

**Your Role:** You are in Plan Mode - help me create detailed, actionable implementation plans.

**Process:**
1. Ask clarifying questions to understand requirements
2. Gather context by reading relevant files
3. Create a detailed, actionable plan using the writing-plans skill
4. Save the plan to \`docs/plans/YYYY-MM-DD-<feature-name>.md\`

**Required Skills:**
- Use \`writing-plans\` skill (located at \`.claude/skills/writing-plans/SKILL.md\`

---

User's original request:
`;

export const planCommand: CommandDefinition = {
  name: 'plan',
  description: 'Enter Plan mode to create detailed implementation plans',
  aliases: ['p'],
  usage: '/plan [your task description]',
  requiresArgs: true,  // 关键：标记需要参数
  execute: async (args: string[], context: CommandContext): Promise<CommandResult> => {
    const userRequest = args.join(' ').trim();

    // 显式参数检查，返回友好错误
    if (!userRequest) {
      return {
        success: false,
        message: '❌ Plan 模式需要提供任务描述\n用法: /plan [your task description]',
      };
    }

    const enhancedMessage = PLAN_PREFIX + userRequest;

    context.sendMessage(
      [{ type: 'human', content: enhancedMessage }],
      { extraParams: context.extraParams }
    );

    return {
      success: true,
      message: '📋 Plan mode activated',
      shouldClearInput: true,
    };
  },
};
```

**2. 命令注册**（`zen-code/src/chat/commands/index.ts`）

```typescript
import { planCommands } from './planCommand';

[...builtinCommands, ...extendedCommands, ...agentCommands, ...interviewCommands, ...planCommands].forEach((command) => {
    commandRegistry.register(command);
});
```

### 参数验证机制

**双重验证**确保命令有参数：

1. **声明式约束**：`requiresArgs: true` - 命令系统在 execute 之前检查
2. **显式检查**：在 execute 函数中检查 `!userRequest` - 提供友好错误消息

**关键变化**：

| 方面 | 修改前 | 修改后 |
|------|--------|--------|
| **参数处理** | `args.join(' ') \|\| '默认值'` | `args.join(' ').trim()` + 显式检查 |
| **requiresArgs** | 未设置 | `true` |
| **无参数行为** | 使用默认值激活模式 | 返回错误消息 |
| **错误提示** | 无 | ❌ Plan 模式需要提供任务描述 |

**避免使用默认值**（如 `|| 'Help me complete a task'`），强制用户明确提供任务描述。

### 适用场景

- ✅ 需要特殊行为模式的命令（interview、plan 等）
- ✅ 不需要修改后端 agent 的模式切换
- ✅ 通过提示词就能改变行为的场景
- ❌ 需要不同工具集或独立 agent 的场景（应使用 switch_command）

### 注意事项

1. **前缀设计**：PLAN_PREFIX 必须包含明确的角色、流程和要求
2. **Skill 引用**：明确指出使用的 skill 文件路径（如 `.claude/skills/writing-plans/SKILL.md`）
3. **错误消息**：使用表情符号（❌）和清晰的用法说明
4. **trim() 处理**：使用 `.trim()` 避免只有空格的输入通过检查

---

## 二、多消息模式（Multi-Message Pattern）

### 核心思想

将命令内容拆分为多个独立的 message，而非构建单个大 message。每个 message 专注单一主题，便于 AI 理解。

### 原因

1. **信息分离**：每个 message 专注单一主题，便于 AI 理解
2. **处理效率**：避免单个超大 message 导致的 token 消耗
3. **自然流程**：符合多轮对话的自然交互模式
4. **可维护性**：易于修改和扩展各个部分

### 实现示例

**Message 结构**（`zen-code/src/chat/commands/sparkToTaskCommand.ts:145-162`）：

```typescript
const messages = [
  {
    type: 'human',
    content: SPARK_TO_TASK_PREFIX.trim(),  // Design Mode 规则
  },
  {
    type: 'human',
    content: `## Available Skills Reference\n\n- **writing-plans**: \`${skillPath}\``,  // Skill 路径引用
  },
  {
    type: 'human',
    content: sparksText,  // 格式化的数据
  },
  {
    type: 'human',
    content: `**Your Task:**\n1. Review the sparks...`,  // 执行指令
  },
];

context.sendMessage(messages, { extraParams: context.extraParams });
```

**关键要点**：
- **路径引用**：只提供 skill 文件路径（`.claude/skills/writing-plans/SKILL.md`），不加载内容
- **数据格式化**：将 SparkStore 数据格式化为 Markdown 文本
- **清晰指令**：每个 message 有明确的主题和目的

### 适用场景

- 需要提供多种类型上下文的命令（规则 + 数据 + 指令）
- 复杂的多步骤任务引导
- 需要引用外部文件的场景

### 不适用场景

- 简单的单步操作命令
- 不需要额外上下文的直接操作

---

## 三、紧凑消息模式（Compact Message Mode）

### 核心思想

TUI 应用的紧凑消息显示模式，解决长对话历史占用过多屏幕空间的问题。只显示 human/ai 消息，工具消息被聚合为摘要。

### 核心功能

**消息显示规则**：
- **只显示 human/ai 消息**：tool 消息被聚合
- **工具摘要组件**：显示工具调用数量和状态统计
- **空 AI 消息处理**：没有文本内容的 AI 消息不显示，只显示工具摘要
- **无装饰 UI**：移除边框和提示文字

### 组件架构

**架构重构（最终方案）**：

```
Chat.tsx (ChatMessages)
  ├─ compactMode = true  → CompactMessagesBox
  └─ compactMode = false → MessagesBox (原始)
```

**优点**：
- 职责分离，逻辑清晰
- 易于维护和测试
- 性能优化（按需加载）

### 配置集成

**类型定义** (`packages/config/src/types/index.ts`):
```typescript
export interface AppConfig {
  compact_mode?: boolean;
}
```

**SettingsContext 实现** (`packages/union-client/src/context/SettingsContext.tsx`):
```typescript
const compactMode = useMemo(() => {
  return config?.compact_mode ?? false;
}, [config]);

const toggleCompactMode = async () => {
  await updateConfig({ compact_mode: !compactMode });
};
```

### 键盘快捷键

**Chat.tsx 中的处理**：
```typescript
useInput(
  (input, key) => {
    if (key.ctrl && input === 'o' && activeView === 'chat' && !loading) {
      // 切换最后一条消息展开
      if (compactMode && toggleLastMessageExpansion) {
        toggleLastMessageExpansion();
      }
    }
  },
  { isActive: activeView === 'chat' }
);
```

### 命令集成

**compactCommand.ts**：
```typescript
export const compactCommand: CommandDefinition = {
  name: 'compact',
  description: '切换紧凑消息显示模式',
  aliases: ['cm'],
  execute: async (args: string[], context: CommandContext) => {
    const { updateConfig } = context;
    const currentConfig = await configStore.getConfig();
    const currentMode = currentConfig.compact_mode ?? false;

    await updateConfig({ compact_mode: !currentMode });

    return {
      success: true,
      message: newMode ? '紧凑模式已启用' : '紧凑模式已关闭',
      shouldClearInput: true,
    };
  },
};
```

### 状态栏指示器

**StatusBar.tsx**：
```typescript
const { compactMode } = useSettings();

return (
  <Box>
    {compactMode && (
      <Text color="blue" bold>
        {' '}[COMPACT]
      </Text>
    )}
  </Box>
);
```

### 使用方法

```bash
/compact    # 切换紧凑模式
/cm         # 别名
Ctrl+O      # 展开/收起最后一条消息
```

### 适用场景

- ✅ 长对话历史需要节省屏幕空间
- ✅ 快速浏览对话流程
- ✅ 关注人类和 AI 的核心交互
- ❌ 需要详细查看工具调用结果时（应切换到完整模式）

### 注意事项

1. **配置持久化**：compact_mode 保存到配置文件，重启后保持状态
2. **消息展开状态**：只在当前会话有效，切换聊天后重置
3. **Static 组件**：紧凑模式也需要处理 Static 的 key 强制重新挂载
4. **性能考虑**：processedMessages 使用 useMemo 缓存，避免重复计算

---

## 相关文件

### 前缀模式
- `zen-code/src/chat/commands/planCommand.ts` - Plan 模式命令
- `zen-code/src/chat/commands/interviewCommand.ts` - Interview 模式命令
- `zen-code/src/chat/commands/index.ts` - 命令注册

### 多消息模式
- `zen-code/src/chat/commands/sparkToTaskCommand.ts` - Sparks 转任务计划命令

### 紧凑消息模式
- `packages/config/src/types/index.ts` - 配置类型定义
- `packages/union-client/src/context/SettingsContext.tsx` - 状态管理
- `zen-code/src/chat/components/CompactMessagesBox.tsx` - 紧凑消息容器
- `zen-code/src/chat/components/CompactMessage.tsx` - 紧凑消息组件
- `zen-code/src/chat/components/CompactToolSummary.tsx` - 工具摘要组件
- `zen-code/src/chat/components/StatusBar.tsx` - 状态栏指示器
- `zen-code/src/chat/commands/compactCommand.ts` - 紧凑模式命令
- `zen-code/src/chat/Chat.tsx` - 键盘快捷键集成

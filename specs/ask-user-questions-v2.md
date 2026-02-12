# Ask User Questions - TUI 工具实现规范

## 概述

本文档描述了基于统一 UI 交互系统的 `ask_user_questions`
工具实现规范。该工具为 TUI（终端用户界面）提供单问题交互能力，用于在执行过程中向用户收集选择或输入。

## 工具定义

### 基本结构

```typescript
// zen-code/src/chat/tools/ask_user_questions.tsx
export const ask_user_questions = createUITool({
  name: 'ask_user_questions',
  description: 'Ask the user a question with selectable options',
  parameters: AskUserQuestionsSchema,
  handler: ToolManager.waitForUIDone,
  render(tool) {
    return <QuestionInteractionComponent tool={tool} />;
  },
});
```

### 参数 Schema

```typescript
import { z } from 'zod';

export const OptionSchema = z.object({
    label: z.string().min(1).max(50).describe('选项显示文本，简洁明了（1-50 字符）'),
});

export const AskUserQuestionsSchema = z.object({
    description: z.string().min(1).describe('向用户提出的问题，清晰具体，包含必要的上下文'),
    type: z.enum(['single_select', 'multi_select']).describe('选择类型：single_select（单选）或 multi_select（多选）'),
    options: z.array(OptionSchema).min(2).max(6).describe('选项列表，至少 2 个，最多 6 个'),
    allow_custom_input: z.boolean().default(true).describe('是否允许用户输入自定义文本，默认 true'),
    placeholder: z.string().optional().describe('自定义输入框的占位符文本'),
});

export type AskUserQuestionsParams = z.infer<typeof AskUserQuestionsSchema>;
```

## 实现细节

### 组件实现

```typescript
// zen-code/src/chat/tools/ask_user_questions.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Box, Text } from 'ink';
import { createUITool, ToolManager } from '@langgraph-js/sdk';
import { useInteractionContext } from '../interaction';
import type { SelectionContent } from '../interaction/content';

/**
 * 问题交互组件
 */
const QuestionInteractionComponent: React.FC<{
  tool: any;
}> = ({ tool }) => {
  const { addInteraction, getInteractions, updateInteraction } = useInteractionContext();
  const [interactionId, setInteractionId] = useState<string | null>(null);
  const hasProcessedRef = useRef(false);

  const input = tool.getInputRepaired();

  // 1. 工具中断时创建交互
  useEffect(() => {
    if (tool.state === 'interrupted' && !interactionId && !hasProcessedRef.current) {
      // 转换选项格式
      const options = input.options?.map((option: any, idx: number) => ({
        label: option.label,
        value: option.label,
      })) || [];

      // 构建选择内容
      const content: SelectionContent = {
        type: 'selection',
        options,
        singleSelect: input.type === 'single_select',
        allowCustomInput: input.allow_custom_input ?? true,
        placeholder: input.placeholder,
      };

      // 添加交互
      const interaction = addInteraction(content, {
        tool,
        metadata: {
          title: input.description || '请选择一个选项',
          groupKey: 'user-input',
        },
      });

      setInteractionId(interaction.id);
    }
  }, [tool, interactionId, addInteraction, input]);

  // 2. 监听交互状态并发送结果
  useEffect(() => {
    if (!interactionId || hasProcessedRef.current) return;

    const checkInteraction = () => {
      const interactions = getInteractions();
      const interaction = interactions.find(i => i.id === interactionId);

      // 交互完成且未发送结果
      if (interaction &&
          (interaction.state === 'submitted' ||
           interaction.state === 'edited' ||
           interaction.state === 'cancelled') &&
          !interaction.resultSent) {
        hasProcessedRef.current = true;

        // 构建结果消息
        const result = interaction.result;
        let message = '';

        if (result) {
          if (result.selected && result.selected.length > 0) {
            message += `User selected: ${result.selected.join(', ')}`;
          }
          if (result.customInput && result.customInput.trim()) {
            message += (message ? '\n' : '') + `User Custom Input: ${result.customInput}`;
          }
        }

        // 发送结果给工具
        tool.sendResumeData({
          type: 'respond',
          message: message || 'User made a selection',
        });

        // 标记结果已发送
        updateInteraction(interactionId, { resultSent: true });
      }
    };

    // 立即检查
    checkInteraction();

    // 轮询检查交互状态（100ms 间隔）
    const interval = setInterval(checkInteraction, 100);

    return () => clearInterval(interval);
  }, [interactionId, getInteractions, updateInteraction, tool]);

  // 3. 渲染状态
  if (tool.state === 'interrupted' && !tool.output) {
    return (
      <Box flexDirection="column">
        <Box paddingX={1}>
          <Text color="yellow">⏳ 等待用户选择...</Text>
        </Box>
      </Box>
    );
  }

  if (tool.output) {
    return <Text color="yellow">{tool.output}</Text>;
  }

  return null;
};

export const ask_user_questions = createUITool({
  name: 'ask_user_questions',
  description: 'Ask the user a question with selectable options',
  parameters: AskUserQuestionsSchema,
  handler: ToolManager.waitForUIDone,
  render(tool) {
    return <QuestionInteractionComponent tool={tool} />;
  },
});
```

### 状态流转

```
工具状态:
  created → interrupted → resumed → completed

交互状态:
  created → editing → submitted/edited/cancelled
```

### 数据流转

```
┌─────────────────────────────────────────────────────────────┐
│ 1. AI 调用 ask_user_questions                                │
│    输入: { description, type, options, allow_custom_input } │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. 工具中断，创建 SelectionContent 交互                      │
│    - 转换选项格式 { label, value }                            │
│    - 映射到统一 UI Content                                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. 交互系统渲染 TUI 界面                                     │
│    - 显示选项和选择控件（箭头键导航）                         │
│    - 显示自定义输入框（如果启用，回车激活）                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. 用户进行选择                                              │
│    - 使用箭头键选择选项                                       │
│    - 按空格切换选中状态（多选模式）                           │
│    - 或按回车激活自定义输入                                   │
│    - 按 Ctrl+Enter 提交                                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. 组件监听交互状态                                          │
│    - 轮询状态变化（100ms）                                    │
│    - 构建结果消息                                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. 通过 sendResumeData() 发送结果                            │
│    - 消息: "User selected: 选项A, 选项B"                     │
│    - 或: "User Custom Input: 自定义文本"                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. AI 接收结果并继续执行                                     │
└─────────────────────────────────────────────────────────────┘
```

## 文件结构

### 新增文件

```
zen-code/src/chat/tools/
└── ask_user_questions.tsx    # 主实现文件
```

### 修改文件

```typescript
// zen-code/src/chat/tools/index.ts
import { ask_user_questions } from './ask_user_questions';

export default [
    // ... 其他工具
    ask_user_questions, // 新增
];
```

## 使用模式

### 单选 + 自定义输入

```typescript
ask_user_questions({
    description: '我们应该使用哪个测试框架？',
    type: 'single_select',
    options: [{ label: 'Vitest' }, { label: 'Jest' }, { label: 'Mocha' }],
    allow_custom_input: true,
    placeholder: '输入其他框架名称...',
});
```

### 多选（禁用自定义输入）

```typescript
ask_user_questions({
    description: '你希望启用哪些功能？',
    type: 'multi_select',
    options: [{ label: '用户认证' }, { label: '权限控制' }, { label: '速率限制' }, { label: '缓存' }],
    allow_custom_input: false,
});
```

### 并行提问（多个独立问题）

```typescript
// 同时询问多个问题
await Promise.all([
    ask_user_questions({
        description: '选择数据库类型',
        type: 'single_select',
        options: [{ label: 'PostgreSQL' }, { label: 'MongoDB' }],
    }),
    ask_user_questions({
        description: '选择 ORM',
        type: 'single_select',
        options: [{ label: 'Prisma' }, { label: 'Drizzle' }],
    }),
]);
```

## TUI 交互说明

### 键盘导航

| 快捷键     | 功能                      |
| ---------- | ------------------------- |
| ↑ / ↓      | 上下移动焦点              |
| Space      | 切换选中状态（多选模式）  |
| Enter      | 提交选择 / 激活自定义输入 |
| Ctrl+Enter | 提交（在自定义输入中）    |
| Esc        | 取消交互                  |

### 单选模式交互

1. 使用 ↑↓ 箭头键在选项间移动
2. 高亮的选项即为当前选择
3. 按 Enter 提交当前选择
4. 如有自定义输入，可先选择自定义选项，再输入文本

### 多选模式交互

1. 使用 ↑↓ 箭头键在选项间移动
2. 按 Space 切换选项的选中状态（显示 ✓）
3. 可同时选中多个选项
4. 按 Enter 提交所有选中的选项
5. 如有自定义输入，可在激活后输入文本

### 自定义输入交互

1. 选择 "Other" 或 "自定义输入" 选项
2. 按 Enter 激活输入模式
3. 输入文本
4. 按 Ctrl+Enter 提交
5. 按 Esc 取消并返回选项选择

## 最佳实践

### 1. 选项数量

- **推荐**：3-6 个选项
- **最少**：2 个选项
- **最多**：6 个选项（Schema 限制）

```typescript
// ✅ 好：数量适中
ask_user_questions({
    description: '选择前端框架',
    type: 'single_select',
    options: [{ label: 'React' }, { label: 'Vue' }, { label: 'Angular' }],
});

// ❌ 不好：选项太少
ask_user_questions({
    description: '是否继续？',
    type: 'single_select',
    options: [{ label: '是' }], // 少于 2 个
});

// ❌ 不好：选项太多
ask_user_questions({
    description: '选择状态',
    type: 'single_select',
    options: Array(10)
        .fill(0)
        .map((_, i) => ({ label: `选项 ${i}` })),
});
```

### 2. 清晰的标签

- **简洁**：1-10 个字
- **描述性**：直接说明选项内容
- **避免**：技术缩写（除非目标用户熟悉）

```typescript
// ✅ 好的标签
options: [{ label: '用户认证' }, { label: '日志系统' }, { label: '监控告警' }];

// ❌ 不好的标签
options: [
    { label: 'Auth' }, // 缩写
    { label: 'Logging and Monitoring System with Alerting' }, // 太长
];
```

### 3. 问题描述

```typescript
// ❌ 不好的描述
ask_user_questions({
    description: '数据库？',
    type: 'single_select',
    // ...
});

// ✅ 好的描述
ask_user_questions({
    description: '我们的项目需要存储用户和订单数据，需要支持复杂查询和事务。请选择合适的数据库：',
    type: 'single_select',
    // ...
});
```

### 4. 自定义输入策略

```typescript
// ✅ 开放性问题，启用自定义输入
ask_user_questions({
    description: '你使用过哪些前端框架？',
    type: 'multi_select',
    options: [{ label: 'React' }, { label: 'Vue' }, { label: 'Angular' }, { label: 'Svelte' }],
    allow_custom_input: true,
});

// ✅ 严格验证，禁用自定义输入
ask_user_questions({
    description: '选择部署环境',
    type: 'single_select',
    options: [{ label: '开发环境' }, { label: '测试环境' }, { label: '生产环境' }],
    allow_custom_input: false,
});
```

### 5. 选择类型选择

```typescript
// ✅ 单选：互斥选项
ask_user_questions({
    description: '选择数据库类型',
    type: 'single_select', // 只能选一个
    options: [{ label: 'PostgreSQL' }, { label: 'MongoDB' }],
});

// ✅ 多选：独立功能
ask_user_questions({
    description: '选择要启用的功能',
    type: 'multi_select', // 可以选多个
    options: [{ label: '缓存' }, { label: '日志' }, { label: '监控' }],
});
```

## 集成点

### 工具注册

```typescript
// zen-code/src/chat/tools/index.ts
import { ask_user_questions } from './ask_user_questions';

export default [
    terminal,
    ask_user_questions, // 新增
    replace_in_file,
    todo_tool,
    read_file,
    glob_files,
    write_file,
    folder_operations,
    batch_command,
];
```

### Agent 提示词更新

更新 Agent 提示词，指导使用新的工具：

```typescript
// packages/agent/src/prompts/coding.ts
5. **请求协助**：使用 \`ask_user_questions\` 询问方向、选择或确认

使用示例：
- 单选：ask_user_questions({ description: '选择框架', type: 'single_select', options: [...] })
- 多选：ask_user_questions({ description: '选择功能', type: 'multi_select', options: [...] })
- 并行提问：Promise.all([ask_user_questions(...), ask_user_questions(...)])
```

## 测试用例

### 基本功能

```typescript
// 1. 单选测试
await ask_user_questions({
    description: '选择一个选项',
    type: 'single_select',
    options: [{ label: '选项 A' }, { label: '选项 B' }, { label: '选项 C' }],
});

// 2. 多选测试
await ask_user_questions({
    description: '选择多个选项',
    type: 'multi_select',
    options: [{ label: '功能 1' }, { label: '功能 2' }, { label: '功能 3' }],
    allow_custom_input: false,
});

// 3. 自定义输入测试
await ask_user_questions({
    description: '选择或输入',
    type: 'single_select',
    options: [{ label: '预设选项 1' }, { label: '预设选项 2' }],
    allow_custom_input: true,
    placeholder: '输入自定义内容...',
});
```

### 边界情况

```typescript
// 1. 最少选项
await ask_user_questions({
  description: '选择',
  type: 'single_select',
  options: [
    { label: '是' },
    { label: '否' },
  ],
})

// 2. 最多选项
await ask_user_questions({
  description: '选择',
  type: 'single_select',
  options: Array(6).fill(0).map((_, i) => ({ label: `选项 ${i + 1}` })),
})

// 3. 取消交互（用户按 Esc）
// 验证工具能正确处理取消状态

// 4. 并行提问
await Promise.all([
  ask_user_questions({ description: '问题 1', type: 'single_select', options: [...] }),
  ask_user_questions({ description: '问题 2', type: 'single_select', options: [...] }),
])
```

## 依赖项

```json
{
    "dependencies": {
        "@langgraph-js/sdk": "^x.x.x",
        "react": "^18.x.x",
        "ink": "^4.x.x"
    }
}
```

### 导入路径

```typescript
// 统一 UI 交互系统
import { useInteractionContext } from '../interaction';
import type { SelectionContent } from '../interaction/content';

// LangGraph SDK
import { createUITool, ToolManager } from '@langgraph-js/sdk';

// Ink 组件
import { Box, Text } from 'ink';
```

## 注意事项

### 1. 结果格式

工具返回的 `message` 格式：

```typescript
// 用户选择预设选项
'User selected: 选项A, 选项B';

// 用户输入自定义文本
'User Custom Input: 自定义内容';

// 用户既选择了选项又输入了自定义文本
'User selected: 选项A\nUser Custom Input: 补充说明';
```

### 2. 交互去重

使用 `hasProcessedRef` 防止重复发送结果：

```typescript
const hasProcessedRef = useRef(false);

// 仅处理一次
if (!hasProcessedRef.current) {
    // ... 处理并发送结果
    hasProcessedRef.current = true;
}
```

### 3. 轮询间隔

交互状态轮询间隔为 100ms，需要在清理时取消：

```typescript
const interval = setInterval(checkInteraction, 100);

return () => clearInterval(interval);
```

### 4. 状态重置

工具完成或取消后，需要重置状态以便下次使用：

```typescript
setInteractionId(null);
hasProcessedRef.current = false;
```

## 迁移指南

### 从旧版本迁移

如果项目中存在旧的 `ask_user_with_options` 工具：

1. **替换工具名**

    ```typescript
    // 旧
    ask_user_with_options({ ... })

    // 新
    ask_user_questions({ ... })
    ```

2. **更新参数格式**

    ```typescript
    // 旧格式
    {
      questions: [{
        prompt: '问题',
        title: '标题',
        options: [{ label: '选项', description: '描述' }],
        multiSelect: false,
      }]
    }

    // 新格式
    {
      description: '问题',
      type: 'single_select',
      options: [{ label: '选项' }],
      allow_custom_input: true,
    }
    ```

3. **多问题改为并行调用**

    ```typescript
    // 旧：单次调用多问题
    ask_user_with_options({
      questions: [{ ... }, { ... }],
    })

    // 新：并行调用
    Promise.all([
      ask_user_questions({ ... }),
      ask_user_questions({ ... }),
    ])
    ```

## 总结

`ask_user_questions` 工具为 TUI 环境提供了简洁、高效的用户交互能力。通过统一 UI 交互系统，实现了：

- **简洁的 API**：单问题设计，易于理解和使用
- **一致的用户体验**：标准化的 TUI 交互模式
- **灵活的功能**：支持单选、多选、自定义输入
- **高效的并行处理**：支持同时提问多个独立问题

该工具适用于需要在执行过程中收集用户决策、偏好或确认的场景。

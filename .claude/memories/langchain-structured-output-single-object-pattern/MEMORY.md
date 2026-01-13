---
name: "langchain-structured-output-single-object-pattern"
description: "使用 LangChain 的 withStructuredOutput 时，提示词与代码必须保持一致，明确要求返回单个对象而非数组"
tags: ["langchain", "structured-output", "prompt-engineering", "zod", "typescript"]
category: "workflow"
created: "2025-01-13"
last_updated: "2025-01-13"
priority: "high"
context_scope: "project"
---

# ## 使用 withStructuredOutput 的最佳实践

## 使用 withStructuredOutput 的最佳实践

在 `/Users/konghayao/code/ai/code-graph/agents/code/memories/analyze.ts` 中，使用 LangChain 的 `withStructuredOutput(Schema)` 时，提示词必须明确说明返回的是单个对象，而非数组。

### 代码模式

```typescript
// Schema 定义（单个对象）
export const MemoryCandidateSchema = z.object({
    name: z.string().describe('记忆名称（kebab-case 格式）'),
    description: z.string().describe('简短描述'),
    tags: z.array(z.string()).describe('记忆标签'),
    category: z.enum(['architecture', 'bug-fix', 'workflow', 'configuration', 'optimization']),
    created: z.string().describe('创建日期（ISO 格式：YYYY-MM-DD）'),
    last_updated: z.string().describe('最后更新日期（ISO 格式：YYYY-MM-DD）'),
    priority: z.enum(['high', 'medium', 'low']).describe('优先级'),
    context_scope: z.enum(['user', 'project']).describe('上下文范围'),
    content: z.string().describe('记忆内容（详细说明，包含代码示例）'),
});

// 使用 withStructuredOutput（返回单个对象）
const response = model.withStructuredOutput(MemoryCandidateSchema);
const memory: MemoryCandidate = await response.invoke(promptMessages);
```

### 提示词关键点

提示词中必须明确说明：
1. **输出单个对象**：不是数组，不是 JSON 格式文本
2. **符合 Schema**：明确列出所有必需字段
3. **结构化输出**：强调模型会自动验证格式

### 示例提示词结构

```
你需要输出一个 JSON 对象，包含以下字段：
- **name** (string): 记忆名称，使用 kebab-case 格式
- **description** (string): 简短描述
- **content** (string): 详细内容
...其他字段
```

### 常见错误

❌ **错误的提示词**：
- "请直接输出 JSON 数组格式"
- "输出 ```json ... ``` 格式"
- "memories 数组应包含..."

✅ **正确的提示词**：
- "你需要输出一个 JSON 对象"
- "符合以下 Schema 的对象"
- "单个 MemoryCandidate 对象"

### 变量命名一致性

当使用单个对象时，变量名应使用单数形式：
- `const memory` 而非 `const memories`
- 函数注释应说明返回单个对象
- 代码注释应与实际行为一致

---
name: "memory-prompt-optimization-quantified-scoring"
description: "记忆系统提示词优化实践：引入量化评分机制、强化单个对象输出、添加命名建议和内容提取模板"
tags: ["prompt-engineering", "memory-system", "langchain", "structured-output"]
category: "optimization"
created: "2025-01-13"
last_updated: "2025-01-13"
priority: "medium"
context_scope: "project"
---

# ## 背景

## 背景

在优化 `/Users/konghayao/code/ai/code-graph/agents/code/memories/analyze.ts` 中的记忆分析提示词时，发现原始提示词存在判断标准模糊、边界处理不明确等问题。

## 关键改进

### 1. 引入量化评分机制（总分 10 分，≥ 6 分才保存）

**重要性** (0-3 分)
- 3 分：关键技术决策、架构设计、重要问题解决方案
- 2 分：有用的编码模式、最佳实践
- 1 分：一般性建议、参考信息
- 0 分：无实际内容

**独特性** (0-3 分)
- 3 分：项目特定配置、非常规解决方案
- 2 分：非显而易见的技巧、特定场景知识
- 1 分：略有新意的做法
- 0 分：常见知识、通用做法

**可复用性** (0-2 分)
- 2 分：跨场景可复用的模式/方法
- 1 分：特定场景下可复用
- 0 分：一次性信息、临时性内容

**持久性** (0-2 分)
- 2 分：长期有效（架构决策、代码模式）
- 1 分：中期有效（配置信息、工作流程）
- 0 分：临时信息（调试过程、一次性请求）

### 2. 强化"单个对象"输出

在提示词的标题和输出格式中强调：
```
**你必须输出单个 JSON 对象（不是数组）**
```

避免使用 `withStructuredOutput` 时模型返回数组导致类型错误。

### 3. 添加命名建议

- 使用 kebab-case 格式（小写、连字符分隔）
- 从核心主题中提取 2-4 个关键词
- 示例：
  - "langchain-structured-output-single-object-pattern"
  - "memory-system-design"
  - "middleware-execution-order"
- 避免通用名称：使用具体的技术术语而非 "fix-bug" 或 "optimization"

### 4. 添加内容提取模板

提取的内容应包含以下部分（按需选择）：
- **背景**：什么问题/场景？
- **决策**：做了什么选择？
- **原因**：为什么这样选择？
- **实现**：关键代码、文件路径、配置
- **适用**：什么场景适用？什么场景不适用？
- **注意**：有什么陷阱或边界情况？

### 5. 明确边界情况处理

**评分 < 6 分**：设置 name 为 "no-memory-{timestamp}"，content 为 "无重要信息"

## 文件路径

`/Users/konghayao/code/ai/code-graph/agents/code/memories/analyze.ts`

## 适用场景

- 使用 LangChain 的 `withStructuredOutput` 进行结构化输出
- 设计记忆提取系统的提示词
- 需要量化判断标准的 AI 系统
- 任何需要明确"单个对象 vs 数组"输出的场景

## 注意事项

1. 评分机制需要根据具体场景调整权重
2. 示例输出（尤其是边界情况）对模型理解非常重要
3. 字段格式说明应包含具体示例（如日期格式、kebab-case 示例）
4. 内容提取模板帮助 AI 生成结构化的记忆内容

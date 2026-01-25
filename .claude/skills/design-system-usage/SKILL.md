---
name: design-system-usage
description: Design System 使用说明
---

# Design System 使用说明

## Overview

Design System 是一个开发设计系统，用于：

-   **规划** - 将模糊想法转化为可执行计划
-   **组织** - 管理任务池和优先级
-   **追踪** - 监控开发进度

## Define

### Spark List

用户输入的原始想法/需求记录。

-   不约束形式（一句话/长描述/代码片段均可）
-   系统负责记录，不预定义格式

### Plan Mode

规划阶段，通过对话澄清需求：

1. 使用 `ask_user_with_options` 与用户交互
2. 澄清 Spark 的具体细节
3. 提出建设性方案
4. 分析代码（如果是 BUG）
5. 输出结构化 MD 文件

### Task Pool

需求池，存储待执行任务：

-   使用 `add_task` 添加
-   支持优先级、依赖关系
-   与 Task System 集成

## Workflow

### Phase 1: 收集 Spark

1. 用户提供想法/需求/BUG
2. 记录到 Spark List

### Phase 2: Plan Mode

> 最好参照相关 skills 进行询问

1. 并发多个 `ask_user_with_options` 询问用户
2. 澄清需求细节
3. 分析影响范围（代码/架构）
4. 生成规划 MD 文件

### Phase 3: 任务化

1. 解析 MD 文件
2. 使用 `add_task` 添加到 Task Pool
3. 设置依赖关系和优先级

## Best Practices

1. **Plan Mode 深度** - 充分对话避免返工
2. **任务拆分** - 每个任务 2-4 小时可完成
3. **依赖明确** - 清晰标注任务间依赖

## Tools Reference

-   `ask_user_with_options` - 用户交互
-   `add_task` - 添加到任务系统
-   `search-files-rg` - 代码分析
-   `read_file` - 文件读取

## Task Breakdown Guidelines

参考 `packages/agent/src/tools/task_tools/add_task_tool.ts` 的任务定义：

### 层级结构

```
Root Task (Feature)
├── children: [
│   Task Group A (execution: parallel)
│   ├── Task 1
│   └── Task 2
│   Task Group B (execution: serial)
│   └── Task 3
│ ]
```

### 任务属性

-   **id**: 唯一标识（UUID 或描述性 ID）
-   **title**: 简短标题（max 200 字符）
-   **description**: 详细描述
-   **execution**: `'serial'` | `'parallel'`（任务组的子任务执行方式）
-   **children**: 子任务数组（递归结构）
-   **agentType**: `'default'` | `'planner'` | `'reviewer'` | `'refactor'` | `'finder'` | `'debugger'`
-   **threadId**: 关联的 LangGraph thread ID（可选，任务开始执行时自动设置）
-   **assignedTo**: 分配的 agent 类型（可选，任务开始时自动设置）
-   **estimatedTime**: 时间估算（`'2h'`, `'1d'`）
-   **complexity**: `'simple'` | `'medium'` | `'complex'`
-   **dependencies**: 依赖的任务 ID 数组
-   **acceptanceCriteria**: 验收标准数组
-   **status**: 任务状态（`'pickup'` | `'running'` | `'complete'` | `'error'` | `'review'` | `'feedback'`）

### 拆分原则

1.  **单职责** - 每个任务只做一件事
2.  **可独立完成** - 不依赖其他任务的内部实现
3.  **可验证** - 有明确的 acceptanceCriteria
4.  **合理粒度** - simple: <1h, medium: 2-4h, complex: >4h

### 示例

```typescript
{
  id: "feature-auth",
  title: "用户认证功能",
  description: "实现登录、注册、密码重置",
  execution: "parallel",
  children: [
    {
      id: "auth-api",
      title: "API 层实现",
      agentType: "default",
      estimatedTime: "2h",
      complexity: "medium",
      acceptanceCriteria: [
        "POST /api/login 返回 JWT token",
        "POST /api/register 创建用户"
      ]
    },
    {
      id: "auth-ui",
      title: "UI 表单实现",
      agentType: "default",
      estimatedTime: "3h",
      complexity: "medium",
      dependencies: ["auth-api"], // 依赖 API 先完成
      acceptanceCriteria: [
        "登录表单验证通过",
        "错误提示正确显示"
      ]
    }
  ]
}
```

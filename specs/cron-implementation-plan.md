# Zen-Swarm Cron 任务系统实现计划

> **状态**: ✅ 已完成（2026-03-06 验证 - 参见 `cron-system-v2.md`）

## 概述

为 zen-swarm 添加定时任务功能，支持 Cron 表达式调度、Agent 执行、日志记录。

**设计文档**: `specs/cron-system-v2.md`

## 需求确认

| 项目     | 决策                                  |
| -------- | ------------------------------------- |
| 服务范围 | zen-swarm 专用                        |
| 并发策略 | 排队等待执行                          |
| 日志保留 | 无限制，手动清理                      |
| 时区     | 服务器 UTC                            |
| 变量替换 | `{{variable}}` 语法，值从任务配置读取 |
| 通知     | 暂不需要                              |

---

## Phase 1: 后端基础

### 1.1 类型定义

- [ ] 创建 `zen-swarm/src/cron/types.ts`
    - CronTask 接口
    - CronLog 接口
    - Input/Update 类型

### 1.2 数据存储

- [ ] 创建 `zen-swarm/src/cron/storage.ts`
    - CronStorage 类
    - 数据库表创建
    - CRUD 操作
    - 日志操作

### 1.3 变量替换

- [ ] 创建 `zen-swarm/src/cron/variable-replacer.ts`
    - replaceVariables 函数

### 1.4 tRPC Router

- [ ] 创建 `zen-swarm/src/api/cron.ts`
    - listTasks, getTask
    - createTask, updateTask, deleteTask
    - toggleTask, triggerTask
    - getLogs, getRecentLogs, clearLogs

### 1.5 集成

- [ ] 更新 `zen-swarm/src/api/trpc.ts` - 添加 cronStorage/cronScheduler 到 Context
- [ ] 更新 `zen-swarm/src/api/index.ts` - 注册 cronRouter

---

## Phase 2: 调度器

### 2.1 执行队列

- [ ] 创建 `zen-swarm/src/cron/queue.ts`
    - ExecutionQueue 类
    - enqueue, canExecute, markRunning, markCompleted

### 2.2 任务执行器

- [ ] 创建 `zen-swarm/src/cron/executor.ts`
    - CronExecutor 类
    - 调用 LangGraph API 创建 Thread
    - 发送 prompt 到 Agent
    - 重试机制

### 2.3 调度器

- [ ] 创建 `zen-swarm/src/cron/scheduler.ts`
    - CronScheduler 类
    - start, stop
    - scheduleTask, unscheduleTask
    - onTrigger 处理
    - triggerManually

### 2.4 初始化

- [ ] 更新 `zen-swarm/src/config/loader.ts`
    - 创建 cronStorage
    - 创建 cronExecutor
    - 创建 cronScheduler
    - 启动调度器

---

## Phase 3: 前端

### 3.1 类型定义

- [ ] 创建 `zen-swarm/src/frontend/types/cron.ts`

### 3.2 组件

- [ ] 创建 `zen-swarm/src/frontend/components/cron/CronTaskList.tsx`
- [ ] 创建 `zen-swarm/src/frontend/components/cron/CronTaskCard.tsx`
- [ ] 创建 `zen-swarm/src/frontend/components/cron/CronTaskForm.tsx`
- [ ] 创建 `zen-swarm/src/frontend/components/cron/CronExpressionInput.tsx`
- [ ] 创建 `zen-swarm/src/frontend/components/cron/VariablesEditor.tsx`
- [ ] 创建 `zen-swarm/src/frontend/components/cron/CronLogList.tsx`
- [ ] 创建 `zen-swarm/src/frontend/components/cron/CronLogItem.tsx`
- [ ] 创建 `zen-swarm/src/frontend/components/cron/QueueIndicator.tsx`

### 3.3 视图

- [ ] 创建 `zen-swarm/src/frontend/views/CronView.tsx`

### 3.4 路由集成

- [ ] 更新 `zen-swarm/src/frontend/types/chat.ts` - 添加 'cron' 到 PanelType
- [ ] 更新 `zen-swarm/src/frontend/layouts/MainLayout.tsx` - 添加 Cron Tab
- [ ] 更新 `zen-swarm/src/frontend/App.tsx` - 添加 CronView 路由

---

## Phase 4: 测试和优化

### 4.1 依赖安装

- [ ] `bun add node-cron cronstrue cron-parser`
- [ ] `bun add -d @types/node-cron`

### 4.2 测试

- [ ] 测试任务 CRUD
- [ ] 测试调度触发
- [ ] 测试排队机制
- [ ] 测试手动触发
- [ ] 测试变量替换
- [ ] 测试日志跳转

---

## 文件清单

```
zen-swarm/src/
├── cron/
│   ├── index.ts                   # 新增
│   ├── types.ts                   # 新增
│   ├── storage.ts                 # 新增
│   ├── scheduler.ts               # 新增
│   ├── executor.ts                # 新增
│   ├── queue.ts                   # 新增
│   └── variable-replacer.ts       # 新增
├── api/
│   ├── index.ts                   # 修改
│   ├── trpc.ts                    # 修改
│   └── cron.ts                    # 新增
├── config/
│   └── loader.ts                  # 修改
└── frontend/
    ├── types/
    │   ├── cron.ts                # 新增
    │   └── chat.ts                # 修改
    ├── components/
    │   └── cron/                  # 新增目录
    │       ├── CronTaskList.tsx
    │       ├── CronTaskCard.tsx
    │       ├── CronTaskForm.tsx
    │       ├── CronExpressionInput.tsx
    │       ├── VariablesEditor.tsx
    │       ├── CronLogList.tsx
    │       ├── CronLogItem.tsx
    │       └── QueueIndicator.tsx
    ├── views/
    │   └── CronView.tsx           # 新增
    ├── layouts/
    │   └── MainLayout.tsx         # 修改
    └── App.tsx                    # 修改
```

## 预计时间

- Phase 1: 1 天
- Phase 2: 1 天
- Phase 3: 2 天
- Phase 4: 1 天

**总计: 5 天**

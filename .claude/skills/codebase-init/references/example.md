# 示例：packages/standard-agent.md

```markdown
# standard-agent

> 路径：`packages/standard-agent/`

## 概述

Agent 系统的核心框架库，提供 AgentPackage、中间件基类、存储抽象等通用能力。

## 文件结构
```

standard-agent/ ├── src/ │ ├── package.ts # AgentPackage 核心类 │ ├── repository.ts # CRUD 操作 │ ├──
validator.ts # 配置验证 │ ├── storage/ # 存储抽象 │ └── middlewares/ # 中间件基类 └── package.json

````

---

## 文件：package.ts

### 概述

AgentPackage 核心类，统一管理工具、中间件、提示词的注册和创建。

### 关键导出

#### `AgentPackage`
> 用途：Agent 系统的中央协调器

- 重点：使用 `fromStorage()` 静态方法创建实例
- 重点：通过 `tools.register()` 注册运行时工具
- 重点：通过 `createTool()` / `createMiddleware()` 创建配置

```typescript
// 创建实例
const pkg = await AgentPackage.fromStorage(storage);

// 注册工具
pkg.tools.register('my_tool', toolImpl);

// 创建 agent
const agent = await createAgent({ pkg, model, systemPrompt });
````

#### `AgentPackage.fromStorage(storage)`

> 用途：从存储创建 AgentPackage 实例

- 重点：storage 必须实现 Storage 接口

---

## 文件：repository.ts

### 概述

提供 Agent 相关资源的 CRUD 操作。

### 关键导出

#### `AgentRepository`

> 用途：管理 models、prompts、tools、middlewares、agents 的 CRUD

- 重点：所有操作通过存储层持久化

---

## 文件：storage/memory.ts

### 概述

内存存储实现，用于测试和临时场景。

### 关键导出

#### `MemoryStorage`

> 用途：内存中的存储实现

- 重点：进程重启后数据丢失

---

## 文件：middlewares/base.ts

### 概述

中间件基类定义。

### 关键导出

#### `AgentMiddleware`

> 用途：所有中间件的基类

- 重点：必须实现 `handle()` 方法
- 重点：通过 `priority` 控制执行顺序

---

## 注意要点

1. **框架层原则**：不依赖应用层代码
2. **依赖注入**：应用层通过回调注入具体实现
3. **存储抽象**：使用 Storage 接口，支持多种后端

```

```

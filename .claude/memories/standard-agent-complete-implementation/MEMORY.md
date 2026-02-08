---
name: "standard-agent-complete-implementation"
description: "standard-agent 模块完整实现：包括架构重构（删除 Entity 层、职责拆分、循环依赖解决）、测试覆盖（190 个用例）、存储层异步化（Promise API）、TUI 工具显示格式统一；适用于需要构建完整、可测试、可维护的 TypeScript 代理模块"
tags: ["architecture-refactor", "testing", "storage", "async", "tui", "circular-dependency", "typescript"]
category: "architecture"
created: "2025-01-13"
last_updated: "2025-02-07"
priority: "high"
context_scope: "project"
---

## 背景

standard-agent 模块从零构建到生产就绪的完整实现历程，涵盖架构设计、测试覆盖、存储层重构和 UI 优化。

## 一、架构重构

### 问题诊断

| 问题 | 描述 |
|------|------|
| 贫血 Entity 层 | Model、Prompt、Tool、Middleware 类仅做验证和存储 |
| 职责重叠 | Registry 和 Storage 都存储 tool schema |
| 代码臃肿 | AgentPackage 350 行，混合 CRUD、验证、序列化 |
| 循环依赖 | `package.ts` ↔ `index.ts` 相互导入 |
| 类型分散 | 定义在 index.ts、types.ts、storage/abstract.ts |

### 重构方案

#### 1. 删除 Entity 层
**理由**：Entity 类只是 Zod Schema 包装，无业务逻辑

**实现**：Repository 直接返回 `z.infer<Schema>`

```typescript
async getModel(id: string): Promise<z.infer<typeof ModelSchema> | undefined> {
    return this.storage.getModel(id);
}
```

#### 2. 职责拆分

| 模块 | 职责 | 文件 | 行数 |
|------|------|------|------|
| AgentRepository | CRUD 操作 | `repository.ts` | < 100 |
| AgentValidator | 数据验证 | `validator.ts` | < 100 |
| AgentSerializer | 序列化/反序列化 | `serializer.ts` | < 100 |
| AgentFactory | 依赖注入 | `factory.ts` | < 100 |

#### 3. 解决循环依赖

**创建 schemas.ts**：所有 Zod Schema 集中管理

```typescript
// standard-agent/schemas.ts - 解决循环依赖的核心
export const ModelSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

export const PromptSchema = z.object({...});
export const AgentSchema = z.object({...});
```

**统一导入路径**：从 `standard-agent/schemas` 导入 Schema

### 文件结构

```
standard-agent/
├── schemas.ts          # 所有 Zod Schema（解决循环依赖）
├── repository.ts       # CRUD 操作
├── validator.ts        # 数据验证
├── serializer.ts       # 序列化逻辑
├── factory.ts          # 依赖注入
├── package.ts          # 主入口（精简版）
├── storage/
│   ├── abstract.ts     # IStorage 接口
│   └── memory.ts       # MemoryStorage 实现
└── types.ts            # TypeScript 类型
```

## 二、测试覆盖

### 架构修复

#### 问题 1: 属性初始化顺序
```typescript
// ❌ 错误：类属性初始化器在构造函数前执行
getModel = this.repository.getModel.bind(this.repository);

// ✓ 正确：移到构造函数内
getModel!: AgentRepository['getModel'];

constructor(storage: IStorage) {
    this.storage = storage;
    this.repository = new AgentRepository(storage);
    this.getModel = this.repository.getModel.bind(this.repository);
}
```

#### 问题 2: IStorage 接口完整性

补充缺失的方法：

```typescript
// Tools
insertTool(data: z.infer<typeof ToolSchema>): Promise<void>;
getTool(id: string): Promise<ToolRow | undefined>;
updateTool(data: z.infer<typeof ToolSchema>): Promise<void>;
deleteTool(id: string): Promise<void>;

// Middlewares
insertMiddleware(data: z.infer<typeof MiddlewareSchema>): Promise<void>;
getMiddleware(id: string): Promise<MiddlewareRow | undefined>;
updateMiddleware(data: z.infer<typeof MiddlewareSchema>): Promise<void>;
deleteMiddleware(id: string): Promise<void>;
```

### 测试文件

| 测试文件 | 测试数 | 覆盖内容 |
|---------|--------|---------|
| memory-storage.test.ts | 29 | MemoryStorage CRUD 操作 |
| repository.test.ts | 22 | AgentRepository 操作 |
| validator.test.ts | 8 | 验证逻辑 |
| serializer.test.ts | 12 | 序列化逻辑 |
| package.test.ts | 21 | AgentPackage 集成测试 |

### 关键测试策略

#### 1. StandardAgent 返回结构
```typescript
// getter 返回 ToolConfig 对象而非布尔值
expect(result?.tools['tool-1']).toEqual({ enabled: true });  // ✓ 正确
```

#### 2. MemoryStorage 删除行为
不自动清理关联，让 validator 检测孤立引用：

```typescript
deleteTool(id: string): Promise<void> {
    return Promise.resolve().then(() => {
        // Do NOT remove from agent_tools
        this.tools.delete(id);
    });
}
```

#### 3. Validator 测试
直接操作内部状态模拟数据损坏：

```typescript
const memStorage = storage as any;
memStorage.agents.get('agent-1').model_id = 'non-existent-model';
const result = await validator.validateAgent('agent-1');
expect(result.valid).toBe(false);
```

### 测试结果

```
190 pass
0 fail
371 expect() calls
Ran 190 tests across 11 files. [302ms]
```

### TypeScript 配置

```json
{
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/__tests__/**", "**/*.test.ts"]
}
```

## 三、存储层异步化

### 重构目标

将 Storage 层所有方法从同步 API 改为异步 API（Promise），确保一致性。

### 接口修改

```typescript
// 之前
getModel(id: string): ModelRow | undefined | Promise<ModelRow | undefined>

// 之后
getModel(id: string): Promise<ModelRow | undefined>
```

### 实现修改

#### MemoryStorage (memory.ts)
所有方法改为 `async`，内部操作包装在 `Promise.resolve()`：

```typescript
async getModel(id: string): Promise<ModelRow | undefined> {
    return Promise.resolve().then(() => this.models.get(id));
}
```

#### Persistence (persistence.ts)
所有方法改为 async，新增 `initialize()`：

```typescript
async initialize(): Promise<void> {
    await this.storage.initialize();
}
```

### Bug 修复

#### Bug 1: updatePrompt name 索引未更新

**问题**：更新 prompt 名称时，`promptsByName` 索引未同步

**修复**：
```typescript
async updatePrompt(data: z.infer<typeof PromptSchema>): Promise<void> {
    return Promise.resolve().then(() => {
        const existing = this.prompts.get(data.id);
        if (!existing) throw new Error(`Prompt ${data.id} not found`);

        const oldName = existing.name;
        const newName = data.name;

        if (oldName !== newName) {
            this.promptsByName.delete(oldName);  // ✓ 删除旧索引
            this.promptsByName.set(newName, data.id);  // ✓ 添加新索引
        }

        this.prompts.set(data.id, { ...existing, ...data });
    });
}
```

#### Bug 2: transaction 回滚机制

**问题**：transaction 失败时未正确回滚 `inTransaction` 状态

**修复**：
```typescript
async transaction<T>(fn: () => Promise<T>): Promise<T> {
    if (this.inTransaction) return fn();

    this.inTransaction = true;
    const snapshot = this.snapshot();  // 创建快照

    try {
        const result = await fn();
        this.inTransaction = false;
        return result;
    } catch (error) {
        this.restore(snapshot);  // ✓ 回滚到快照
        this.inTransaction = false;
        throw error;
    }
}
```

### 测试更新

所有测试用例改为 async/await：

```typescript
// 之前
test('getModel', () => {
    const model = storage.getModel('model-1');
    expect(model).toBeDefined();
});

// 之后
test('getModel', async () => {
    const model = await storage.getModel('model-1');
    expect(model).toBeDefined();
});
```

## 四、TUI 工具显示格式统一

### 格式规范

**统一格式**: `ToolName(path)` 或 `ToolName(pattern)`

### 关键规则

1. 每个工具类型使用不同颜色
2. 括号内容使用 `dimColor()`
3. path/pattern 必须使用 `Link` 组件渲染
4. Link 组件颜色与标题颜色一致
5. 标题文本后添加空格

### 颜色映射

| 工具 | 格式 | 颜色 |
|------|------|------|
| read_file | `Read(path)` | 蓝色 |
| write_file | `Write(path)` | 绿色 |
| replace_in_file | `Edit(path)` | 黄色 |
| glob_files | `Glob(pattern)` | 青色 |
| terminal | `Run(command)` | 洋红色 |
| folder_operations | `{op}Folder(path)` | 动态 |

### 代码示例

#### read_file.tsx
```tsx
render(tool) {
    const input = tool.getInputRepaired();
    return (
        <Text>
            <Text color="blue">Read</Text>{' '}
            (<Text dimColor>
                <Link url={`file://${input.file_path}`}>
                    {input.file_path}
                </Link>
            </Text>)
        </Text>
    );
}
```

#### folder_operations.tsx
```tsx
const colors = {
    create: 'green',
    list: 'blue',
    exists: 'yellow',
    delete: 'red'
};

const color = colors[input.operation] || 'gray';
const capitalizedOp = input.operation.charAt(0).toUpperCase() + input.operation.slice(1);

<Text color={color}>{capitalizedOp}Folder</Text>{' '}
(<Text dimColor><Link url={`file://${input.folder_path}`}>{input.folder_path}</Link></Text>)
```

## 架构决策总结

| 决策 | 理由 |
|------|------|
| 删除 Entity 层 | 贫血模型无价值，Zod Schema 已包含验证 |
| 单一职责拆分 | 每个模块 <100 行，易于测试和维护 |
| Schema 独立文件 | 物理隔离打破循环依赖 |
| Repository 直接返回 infer | 减少包装层，简化调用链 |
| 全异步 API | 统一接口，支持 I/O 操作 |
| 统一显示格式 | 提高 TUI 可读性和美观性 |

## 适用场景

- 需要构建完整、可测试的 TypeScript 代理模块
- 存在贫血 Entity 层或职责不清的架构
- 需要打破循环依赖的模块
- 需要统一异步存储接口的分层架构
- 需要 TUI 工具调用格式统一的场景

## 注意事项

### 架构层面
1. Schema 集中管理在 `schemas.ts`，避免分散
2. Schema 导入统一使用 `standard-agent/schemas`
3. 每个模块只负责一个关注点（单一职责）
4. Repository 返回 `z.infer`，不要创建额外包装类型

### 测试层面
1. 类属性初始化器在构造函数前执行
2. BaseStorage 抽象方法必须在 IStorage 接口中声明
3. StandardAgent getter 返回配置对象而非原始值
4. 测试删除行为时不自动清理关联数据

### 存储层面
1. 检查项目中其他使用 storage 的代码是否需要 `await`
2. Promise 包装在内存存储中性能开销可忽略
3. 事务回滚必须正确恢复所有状态
4. 索引更新必须与主数据同步

### UI 层面
1. 只修改 `tools` 文件夹内的渲染逻辑
2. Link 组件的 `color` 必须与标题颜色相同
3. 括号和标题之间添加空格（`ToolName (`）
4. path 使用 `file://` 协议
5. 非 path 内容（如 command）不使用 Link

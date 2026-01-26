# 前后端耦合情况审阅

## 概述

zen-code 项目采用 Monorepo 架构，前端 (tui/) 和后端 (agents/code/) 在同一个仓库中。当前存在多处直接耦合，影响独立开发、测试和部署。

---

## 耦合点分类

### 1. **严重耦合 - 直接后端代码导入**

#### 1.1 前端直接导入后端 Graph
**位置**: `tui/src/nonInteractive.ts:2`
```typescript
import { graph } from '../../agents/code/graph.js';
```
- **问题描述**: 非交互模式直接导入并调用后端 LangGraph 实例
- **影响范围**: 仅限 `nonInteractive` 功能
- **耦合等级**: ⚠️ 严重
- **原因**: 跳过 HTTP 通信，直接使用内存 graph 实例
- **影响**:
  - 前端无法独立运行（需要后端代码编译产物）
  - 非交互模式无法通过网络调用远程服务
  - 测试时需要启动完整后端环境

#### 1.2 前端导入后端导出的 LangGraphFetch
**位置**:
- `tui/src/chat/Chat.tsx:26`
```typescript
import { LangGraphFetch } from '../../../agents/code/export';
```

**后端定义**: `agents/code/export.ts`
```typescript
import { registerGraph } from '@langgraph-js/pure-graph';
import { graph } from '../code/graph.js';
import { handleRequest } from '@langgraph-js/pure-graph/dist/adapter/fetch';

registerGraph('code', graph);
export const LangGraphFetch = (url: string, init: RequestInit = {}) => {
    return handleRequest(new Request(url, init), {});
};
```

- **问题描述**: 前端导入后端导出的 `LangGraphFetch` 函数并作为 ChatProvider 的 fetch 参数
- **耦合等级**: ⚠️ 严重
- **影响**:
  - 前端构建依赖后端构建产物
  - 无法独立部署前端（必须携带后端代码）
  - 前端开发时需要编译后端 TypeScript

---

### 2. **中度耦合 - 配置共享**

#### 2.1 配置文件路径后端化
**位置**: `tui/src/chat/store/index.ts`
```typescript
const zenConfigDir = path.join(userHome, '.zen-code');
export const dbPath = path.join(zenConfigDir, 'settings.json');
```

**后端使用**: `~/.zen-code/settings.json` 被 `getConfig()` 读取并同步到环境变量
```typescript
export const syncEnvFromConfig = () => {
    if (db.data.config.model_provider) process.env.MODEL_PROVIDER = ...
    if (db.data.config.openai_api_key) process.env.OPENAI_API_KEY = ...
    // ...
};
```

- **问题描述**: 前端直接读取配置文件，后端依赖环境变量，通过前端同步
- **耦合等级**: ⚠️ 中度
- **影响**:
  - 配置逻辑在前端实现，后端仅读取环境变量
  - 修改配置逻辑需要同时考虑前后端兼容性

#### 2.2 硬编码 API URL
**位置**: `tui/src/chat/Chat.tsx:263`
```typescript
apiUrl="http://127.0.0.1:8123"
```

**后端端口**: `agents/code/server.ts`
```typescript
export default {
    fetch: app.fetch,
    port: 8123,
};
```

- **问题描述**: 前端硬编码后端服务端口
- **耦合等级**: ⚠️ 中度
- **影响**:
  - 无法灵活切换开发/生产环境
  - 无法同时运行多个后端实例

---

### 3. **轻度耦合 - 共享类型与工具**

#### 3.1 共享类型定义
**位置**: 多处导入 `@langgraph-js/sdk`
```typescript
import { Message, RenderMessage, ToolRenderData } from '@langgraph-js/sdk';
```

- **问题描述**: 前后端依赖同一 SDK 的类型定义
- **耦合等级**: ✅ 可接受（通过 npm 包解耦）

#### 3.2 前端工具注册
**位置**: `tui/src/chat/tools/*.tsx`
```typescript
import { createUITool, ToolManager } from '@langgraph-js/sdk';

export const read_file = createUITool({...});
```

- **问题描述**: 前端实现工具并注册到 SDK
- **耦合等级**: ✅ 可接受（SDK 提供接口）

---

## 耦合根源分析

### 架构层面
1. **Monorepo 布局导致的便利性陷阱**: 前后端在同一仓库，容易产生直接依赖
2. **早期快速迭代优先**: 为快速实现非交互模式，直接导入后端代码
3. **缺乏明确的 API 边界**: 没有定义清晰的接口契约

### 技术层面
1. **LangGraph SDK 的灵活性**: 提供了直接 graph 调用和 HTTP 调用两种方式，前端选择了混合使用
2. **LangGraphFetch 的特殊设计**: 后端导出 fetch 函数给前端使用，而非标准 REST API

---

## 解耦建议

### 短期方案 (保持现有架构)

#### 1. 统一使用 HTTP 通信
**目标**: 消除所有直接导入后端代码的行为

**改造点**:
```typescript
// tui/src/nonInteractive.ts
// 当前: import { graph } from '../../agents/code/graph.js';
// 改造: 使用 fetch 调用后端 HTTP API

async function runNonInteractive(prompt?: string, useStdin: boolean = false) {
    await initDb();
    const config = getConfig();

    // 使用 HTTP 调用
    const response = await fetch('http://127.0.0.1:8123/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            messages: [{ type: 'human', content: finalPrompt }],
            main_model: config.main_model,
            enable_thinking: config.enable_thinking,
        }),
    });

    const result = await response.json();
    // ... 处理响应
}
```

**优点**:
- 前后端完全解耦
- 前端可独立部署
- 支持远程服务调用

**缺点**:
- 需要定义清晰的 HTTP API
- 后端需要提供 invoke 端点

---

#### 2. LangGraphFetch 前后端分离
**目标**: 前端不依赖后端代码

**改造点**:
```typescript
// agents/code/export.ts → 删除此文件

// tui/src/utils/LangGraphFetch.ts (前端实现)
export const LangGraphFetch = (url: string, init: RequestInit = {}) => {
    // 纯前端实现，无需导入后端代码
    return fetch(url, init);
};

// 或者直接使用 fetch
<ChatProvider
    apiUrl="http://127.0.0.1:8123"
    fetch={fetch} // 使用标准 fetch
>
```

---

#### 3. 配置管理统一
**目标**: 配置逻辑由后端统一管理

**改造点**:
```typescript
// 后端提供配置 API
// agents/code/api/config.ts

export const configRouter = new Router()
    .get('/', async (c) => {
        return c.json(getConfig());
    })
    .post('/', async (c) => {
        const data = await c.req.json();
        await updateConfig(data);
        return c.json({ success: true });
    });

// 前端调用后端 API
// tui/src/chat/store/index.ts

export const getConfig = async () => {
    const response = await fetch('http://127.0.0.1:8123/api/config');
    return response.json();
};
```

---

### 中期方案 (架构优化)

#### 1. 定义清晰的 API 契约
**目标**: 前后端通过 OpenAPI/TypeScript 类型契约通信

```yaml
# openapi.yaml
paths:
  /invoke:
    post:
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/InvokeRequest'
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InvokeResponse'
```

```bash
# 自动生成前端类型
openapi-typescript openapi.yaml -o tui/src/api/types.ts
```

---

#### 2. 环境配置分离
**目标**: 支持多环境部署

```bash
# .env.development
LANGGRAPH_API_URL=http://127.0.0.1:8123

# .env.production
LANGGRAPH_API_URL=https://api.zen-code.com
```

```typescript
// tui/src/config.ts
export const API_URL = process.env.LANGGRAPH_API_URL || 'http://127.0.0.1:8123';
```

---

### 长期方案 (完全解耦)

#### 1. 物理分离前后端仓库
```
zen-code/
├── backend/          # 后端仓库
│   └── agents/code/
└── frontend/         # 前端仓库
    └── tui/
```

#### 2. 独立部署
- 后端: Docker 容器 + 暴露 REST API
- 前端: 静态资源 + CDN

---

## 优先级建议

### P0 (立即修复)
- [ ] 移除 `tui/src/nonInteractive.ts` 中的 `graph` 直接导入
- [ ] 移除 `tui/src/chat/Chat.tsx` 中的 `LangGraphFetch` 导入

### P1 (短期规划)
- [ ] 统一使用 HTTP 通信
- [ ] 定义 REST API 契约
- [ ] 配置管理后端化

### P2 (中期优化)
- [ ] 环境配置分离
- [ ] 前后端独立构建流水线

### P3 (长期规划)
- [ ] 物理分离前后端仓库
- [ ] 独立部署架构

---

## 总结

当前项目存在 **2 处严重耦合**，主要是：
1. 前端直接导入后端 Graph 实例 (`nonInteractive.ts`)
2. 前端导入后端导出的 `LangGraphFetch` (`Chat.tsx`)

**建议优先修复 P0 级别问题**，统一使用 HTTP 通信，使前后端完全解耦，便于独立开发、测试和部署。

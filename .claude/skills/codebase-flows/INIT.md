# 初始化 .codebase/FLOWS 文档

为项目生成 `.codebase/FLOWS.md` 和各流程详情文件。

## 执行流程

### 步骤 1：读取上下文（主 Agent）

按顺序读取，不做深度探索：

1. 项目入口文件（`cli.ts`、`server.ts`、`app.tsx` 等）——找到真实触发点
2. 根目录 `package.json`——确认技术栈

收集到足够上下文后，立即派发 Scanner SubAgent。

### 步骤 2：派发 Scanner SubAgent

派发一个 Scanner 识别项目中所有有价值的核心流程（数量以项目实际规模为准，小项目可能 5 个，大型项目可能 15 个以上）。

#### Scanner SubAgent 任务模板

```
分析项目结构，识别最值得文档化的端到端流程。

已知项目信息：
[从步骤 1 收集的架构信息]

任务：
1. 识别所有核心用户流程（从用户触发到系统响应的完整路径），数量以项目实际复杂度为准
2. 每个流程必须跨越至少 2 个不同模块
3. 优先选择：高频使用、容易令开发者困惑、跨越多层架构的流程

候选流程类型（按优先级）：
- 用户主要交互路径（发消息、执行命令等）
- 异步/事件驱动流程（工具调用、审批回调）
- 跨层通信（Client → Application → Framework）
- 数据持久化路径（状态保存、配置更新）
- 定时/后台任务执行

不要选择：
- 单文件内部的简单函数调用
- 纯 UI 渲染逻辑（无业务含义）
- 已有详细文档的标准库流程

输出格式（纯 JSON，不附加其他文字）：
{
  "flows": [
    {
      "id": "user-message",
      "name": "用户消息处理",
      "description": "用户在 TUI 输入消息，经 LangGraph 处理后返回流式响应的完整路径",
      "entry_file": "zen-code/src/chat/components/layout/ChatMain.tsx",
      "entry_function": "handleSubmit",
      "exit_description": "SSE 流式响应 → useChat hook → 消息渲染",
      "layers": ["Client", "Application", "Framework"],
      "key_files": [
        "zen-code/src/chat/components/layout/ChatMain.tsx",
        "packages/agent/src/server.ts",
        "packages/agent/src/graphBuilder.ts"
      ],
      "why_important": "最核心的用户路径，理解它才能排查响应问题"
    }
  ]
}
```

### 步骤 3：分批追踪流程（循环直到全部完成）

**批次大小**：默认每批 **3** 个 SubAgent 并行。

```
remaining = Scanner 返回的 flows 数组（全部）

循环：
  当 remaining 不为空时：
    batch = 取 remaining 前 3 个，从 remaining 中移除
    并行派发 batch 中每个流程的 Tracer SubAgent
    等待本批全部完成
    继续下一轮

直到 remaining 为空
```

**不要在第一批完成后停止**，必须处理所有流程。

#### Tracer SubAgent 任务模板

````
追踪以下流程的完整调用链，并独立写入文件。

流程信息：
- ID：[flow.id]
- 名称：[flow.name]
- 描述：[flow.description]
- 入口：[flow.entry_file] → [flow.entry_function]
- 终点描述：[flow.exit_description]
- 关键文件提示：[flow.key_files]

追踪方法：
1. 读取入口文件，找到 entry_function 的实现
2. 识别它调用的下一个关键函数（忽略工具函数、类型转换等细节）
3. **严格控制 3-6 层深度**，这是质量红线
4. 在每一步记录：文件路径（相对路径）、函数名、参数/返回值的关键类型
5. 标注重要的边界：异步等待点、模块跨越点、数据变换点

追踪原则：
- 选择"主干路径"，忽略错误处理分支
- 遇到 Promise/async 时，追踪 await 之后的路径
- 遇到回调/事件时，追踪最主要的那个处理函数

**压缩策略**（避免调用链过长）：
- ❌ 跳过：组件渲染链（如 `main() → render(<App/>) → <App> → <Child>`）
- ❌ 跳过：纯传递调用（函数只做转发，无业务逻辑）
- ❌ 跳过：框架内部调用（如 React 渲染、LangChain 内部）
- ✅ 保留：跨模块边界（Client → Server → Framework）
- ✅ 保留：数据变换点（输入类型 → 输出类型）
- ✅ 保留：异步/网络边界
- ✅ 保留：用户交互点

**示例**：用户消息处理（正确压缩后）
```
[入口] ChatInput.handleSendMessage(input)
  ↓ 网络边界：HTTP POST
[调用] packages/agent/src/export.ts:handleRequest()
  ↓ 数据变换：Message[] → CodeStateType
[调用] packages/agent/src/graphBuilder.ts:invokeAgent()
  ↓ 模块跨越：Application → Framework
[调用] packages/agent/src/subagents/unified-factory.ts:createUnifiedAgent()
  ↓ 异步边界：Agent 执行
[出口] SSE 流式响应 → UI 渲染
```
**仅 5 层**，而非未压缩的 16 层。

- 如果某步调用了多个函数，只追踪最关键的那条线

输出要求：
1. 生成完整的 Markdown 文件
2. 使用 write_file 工具写入：`.codebase/FLOWS/{flow.id}.md`
3. 文件内容格式如下：

```markdown
# [name]

> [description]

**触发方式**：[用户如何触发，例如"在 TUI 输入框按 Enter"]
**重要程度**：[why_important]

## 调用链

```

[入口] path/to/file.ts functionName(inputType) → returnType
  ↓ 网络边界 / 数据变换 / 模块跨越（选一个最合适的标注）
[调用] path/to/other.ts nextFunction(arg: ArgType)
  ↓ ...
[出口] path/to/response.ts handleResponse(stream) → void

```

## 关键节点

| 节点 | 位置 | 说明 |
|------|------|------|
| 入口 | path/file.ts | [触发原因] |
| [关键步骤] | path/file.ts | [为什么这一步重要] |
| 出口 | path/file.ts | [输出形式] |

## 开发者注意

- [容易踩的坑或非显而易见的行为]
- [重要的并发/异步行为]
- [与其他流程的交互点]

---

*生成时间：[YYYY-MM-DD HH:MM]*
```

重要：必须使用 write_file 工具将完整内容写入 `.codebase/FLOWS/{flow.id}.md`，不要返回 Markdown 文本。

````

### 步骤 4：生成流程索引（主 Agent）

所有 Tracer SubAgent 完成后，确保目录存在并生成索引：

```bash
mkdir -p .codebase/FLOWS
```

写入 `.codebase/FLOWS.md`：

```markdown
# .codebase 流程图

> 记录项目关键功能的端到端调用链，回答"代码**如何**运作"的问题。

## 流程列表

| 流程                       | 描述               | 跨越模块                  |
| -------------------------- | ------------------ | ------------------------- |
| [流程名](FLOWS/flow.id.md) | [flow.description] | [flow.layers.join(' → ')] |

---

_最后更新：[YYYY-MM-DD]_
```

## 质量检查清单

- [ ] FLOWS.md 存在，标题为 `# .codebase 流程图`
- [ ] 流程数量覆盖项目所有核心功能路径（以实际项目规模为准）
- [ ] 每个流程调用链深度 3-6 层（浅了无意义，深了难读）
- [ ] 调用链中每一步有具体文件路径（相对路径，不需要行号）
- [ ] 每个流程有"开发者注意"章节（至少 1 条实质性内容，不是套话）
- [ ] 调用链覆盖了至少 2 个不同模块

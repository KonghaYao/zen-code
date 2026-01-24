---
name: "langgraph-createuitool-web-ui-pattern"
description: "LangGraph SDK 的 createUITool 在不同 UI 框架下的使用模式：zen-code (TUI/Ink) 和 zen-worker (Web/React DOM) 都使用 createUITool 创建工具定义，通过 setTools() 注册；关键差异在于 render 函数返回值类型（Ink vs React DOM），适用于需要在不同前端框架中集成 LangGraph 工具的场景"
tags: ["langgraph", "createUITool", "tool-registration", "ink-vs-react", "sdk-integration", "setTools"]
category: "architecture"
created: "2025-01-23"
last_updated: "2025-01-23"
priority: "high"
context_scope: "project"
---

# ## 背景

## 背景

需要在 zen-worker（Web UI）中实现和 zen-code（TUI）一样的工具系统。我最初误解了工具注入方式，创建了 ToolRegistry 元数据系统。用户指出错误后，通过研究 SDK 源码发现了正确的实现方式。

## 正确的工具注入方式

### zen-code 的实现
`zen-code/src/chat/Chat.tsx:158-160`:
```typescript
const { setTools } = useChat();
useEffect(() => {
    setTools(DefaultTools);
}, []);
```

`zen-code/src/chat/tools/terminal.tsx`:
```typescript
import { createUITool, ToolManager, ToolRenderData } from '@langgraph-js/sdk';

export const terminal = createUITool({
    name: 'terminal',
    description: '',
    parameters: {},
    handler: ToolManager.waitForUIDone,
    render(tool) {
        return <ApprovalContentComponent tool={tool} />;  // Ink 组件
    },
});
```

### zen-worker 的实现（相同方式，不同 UI）
`zen-worker/src/tools/terminal.tsx`:
```typescript
import { createUITool } from '@langgraph-js/sdk';

export const terminal = createUITool({
    name: 'terminal',
    description: 'Execute terminal commands',
    parameters: {} as any,
    handler: async (args, context) => {
        return [{ type: 'text', text: 'Command executed' }];
    },
    render(tool) {
        const input = tool.getInputRepaired();
        return (
            <div className="bg-gray-900 text-green-400 p-3 rounded-lg">
                <span>{input?.command}</span>
            </div>
        );  // React DOM 元素
    },
});
```

`zen-worker/src/pages/ChatPage.tsx:18-22`:
```typescript
import DefaultTools from '../tools';

const { setTools } = useChat();
useEffect(() => {
    setTools(DefaultTools);
}, [setTools]);
```

## 关键发现

1. **createUITool 来源**：`@langgraph-js/sdk`，不是前端框架特定的
2. **注册方式**：通过 `setTools(UnionTool[])` 将工具数组注册到 SDK
3. **SDK 渲染**：SDK 自动调用工具的 `render` 函数来显示工具调用
4. **UI 框架差异**：
   - zen-code: render 返回 Ink 组件 (`<Box>`, `<Text>`)
   - zen-worker: render 返回 React DOM (`<div>`, `<span>`)

## ToolRenderData API

render 函数接收的对象包含：
- `getInputRepaired()`: 获取工具输入
- `output`: 工具输出
- `status`: 工具状态 ('pending' | 'running' | 'completed' | 'error' | 'interrupted')
- `message`: 消息信息 {name, id, index}
- `getHumanInTheLoopData()`: HITL 数据
- `sendResumeData(data)`: 发送恢复数据（审批后）

## 实现的工具

zen-worker 中创建了 9 个工具：
1. terminal - 终端命令执行
2. read_file - 读取文件
3. write_file - 写入文件
4. glob_files - 文件搜索
5. folder_operations - 文件夹操作
6. batch_command - 批量命令
7. ask_user_with_options - 用户选择
8. todo_tool - 任务管理
9. replace_in_file - 文件替换

## 适用场景

- 需要在不同前端框架中集成 LangGraph 工具
- 需要自定义工具的 UI 渲染
- 需要处理工具的中断/审批状态

## 注意事项

1. **handler 函数**：实际执行逻辑在后端，前端只是 UI 渲染
2. **参数定义**：parameters 使用 Zod schema（目前暂用 `{} as any`）
3. **样式差异**：Ink 使用 color props，React DOM 使用 Tailwind CSS classes
4. **注册时机**：在 ChatPage 组件中通过 useEffect 注册，依赖 setTools

## 文件引用

- SDK 定义: `node_modules/@langgraph-js/sdk/src/tool/createTool.ts`
- zen-code 示例: `zen-code/src/chat/tools/terminal.tsx`
- zen-worker 实现: `zen-worker/src/tools/*.tsx`

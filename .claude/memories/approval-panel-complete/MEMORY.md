---
name: "approval-panel-complete"
description: "LangGraph UI 工具的全局审批面板完整系统：从 HumanApproval 单组件演进到 GlobalApprovalPanel 多 Tab 架构，支持批量暂存执行（Ctrl+E）、自动执行、自动跳转下一个 Pending 请求。包括 ApprovalContext 状态管理、三态审批（Approve/Edit/Reject）、类型安全、性能优化。适用于需要统一管理多个工具审批请求的 TUI 应用。"
tags: ["langgraph", "global-approval-panel", "batch-execution", "auto-navigation", "react-optimization", "approval-workflow", "state-management"]
category: "architecture"
created: "2025-01-17"
last_updated: "2025-01-20"
priority: "high"
context_scope: "project"
---

## 背景

LangGraph UI 工具需要审批机制，演进路径：
1. **HumanApproval**：单个工具独立弹窗审批
2. **GlobalApprovalPanel**：全局多 Tab 面板统一管理
3. **批量执行重设计**：从立即执行改为暂存后统一执行
4. **自动化交互**：自动执行 + 自动跳转下一个请求

## 核心架构

### 1. ApprovalContext 状态管理

`tui/src/chat/context/ApprovalContext.tsx`

```typescript
// 计算所有请求是否都已处理完毕
const allRequestsProcessed = useMemo(
    () => requests.length > 0 && !hasPendingRequests,
    [requests.length, hasPendingRequests]
);

// 当所有请求都处理完毕时，自动执行
useEffect(() => {
    if (allRequestsProcessed) {
        executeApproved();
    }
}, [allRequestsProcessed, executeApproved]);

// 批量执行所有已处理的请求
const executeApproved = useCallback(async () => {
    const processedRequests = requests.filter(req =>
        req.status === ApprovalStatus.Approved ||
        req.status === ApprovalStatus.Edited ||
        req.status === ApprovalStatus.Rejected
    );
    
    for (const request of processedRequests) {
        await onExecuteRequest(request);
    }
    
    clearCompletedApprovals();
}, [requests, onExecuteRequest, clearCompletedApprovals]);
```

### 2. GlobalApprovalPanel 多 Tab 面板

`tui/src/chat/components/GlobalApprovalPanel/GlobalApprovalPanel.tsx`

**自动跳转下一个 Pending 请求**：
```typescript
const nextTab = useCallback(
    (currentRequestId: string) => {
        const currentIndex = requests.findIndex(r => r.id === currentRequestId);
        // 优先向后找 Pending
        const nextPending = requests.slice(currentIndex + 1).find(r => r.status === ApprovalStatus.Pending);
        
        if (nextPending) {
            setActiveTab(nextPending.id);
        } else {
            // 如果后面没有，从开头找
            const firstPending = requests.find(r => r.status === ApprovalStatus.Pending);
            if (firstPending) {
                setActiveTab(firstPending.id);
            }
        }
    },
    [requests]
);

// 在 approve/edit/reject handler 中调用
const handleApprove = useCallback((requestId: string) => {
    updateApprovalRequest(requestId, { status: ApprovalStatus.Approved });
    nextTab(requestId);
}, [updateApprovalRequest, nextTab]);
```

**Tabs 状态联动**（修复切换不响应问题）：
```typescript
<Tabs
    key={activeTab}  // 强制重新渲染
    items={tabItems}
    defaultIndex={tabItems.findIndex(item => item.id === activeTab)}
    onChange={handleTabChange}
/>
```

**快捷键监听**：
```typescript
useInput((input, key) => {
    if (key.ctrl && input === 'e' && canExecuteApproved) {
        executeApproved();
    }
}, { isActive: true });
```

### 3. ApprovalItem 单个审批项

`tui/src/chat/components/GlobalApprovalPanel/ApprovalItem.tsx`

- 支持三态：Approve ✅ / Edit 📝 / Reject ❌
- 集成 MultiSelectPro 选择器和 EnhancedTextInput 编辑器
- 显示消息索引和描述信息

**状态强制重置**（修复切换 tab 时状态残留）：
```typescript
<ApprovalItem
    key={`${request.id}-${activeTab}`}  // 包含 activeTab 确保重新挂载
    request={request}
    autoFocus={isSelected}
/>
```

### 4. 类型定义

`tui/src/chat/components/GlobalApprovalPanel/types.ts`

```typescript
export enum ApprovalStatus {
  Pending = 'pending',
  Approved = 'approved',
  Edited = 'edited',
  Rejected = 'rejected',
}

export interface ApprovalRequest {
  id: string;
  toolCall: { name: string; args: any };
  tool?: any;  // 存储工具引用，用于后续执行
  status: ApprovalStatus;
  editedArgs?: any;
  createdAt: Date;
  messageIndex?: number;
  description?: string;
}
```

## 关键 Bug 修复

### 1. 批量执行不生效
- **类型定义缺失**：`ApprovalRequest` 缺少 `tool` 字段
- **状态比较错误**：`status === 'approved'` 应为 `ApprovalStatus.Approved`
- **快捷键不匹配**：注释说 `Ctrl+E`，代码用 `Alt+E`

### 2. Tab 切换控件不更新
- **根因**：组件内部状态（`selectState`、`isEditing`）在 tab 切换时保留
- **解决**：修改 key 策略为 `${request.id}-${activeTab}`

### 3. 输入监听冲突
- **问题**：`useInput` 缺少 `isActive` 条件
- **解决**：`useInput(handler, { isActive: isEditing })`

### 4. useEffect 依赖循环
- **问题**：依赖包含 `addApprovalRequest` 导致重复执行
- **解决**：使用 ref 模式
```typescript
const addApprovalRequestRef = useRef(addApprovalRequest);
useEffect(() => { addApprovalRequestRef.current = addApprovalRequest; }, [addApprovalRequest]);

useEffect(() => {
    if (interrupt?.reviewConfig && !submittedRef.current) {
        addApprovalRequestRef.current(request);
    }
}, [interrupt, tool]); // 移除 addApprovalRequest 依赖
```

## 工作流程

```
1. 用户操作
   ├─ Approve → 状态变为 ✅ Approved
   ├─ Edit → 状态变为 📝 Edited + 保存 editedArgs
   └─ Reject → 状态变为 ❌ Rejected
   └─ 自动跳转下一个 Pending 请求

2. 自动执行（allRequestsProcessed = true）
   ├─ 过滤 Approved/Edited/Rejected 状态
   ├─ 依次调用 onExecuteRequest → tool.sendResumeData
   └─ 清空所有已处理的请求

3. 手动批量执行（Ctrl+E）
   └─ 同上，但需用户主动触发
```

## 性能优化

- **useMemo**：`hasPendingRequests`、`contextValue` 避免不必要重渲染
- **key 策略**：tab 切换时强制重新挂载组件
- **isActive 条件**：避免 useInput 监听冲突

## 集成方式

### terminal.tsx 添加请求
```typescript
const request: ApprovalRequest & { tool?: any } = {
  id: generateId(),
  toolCall: { name: tool.message.name!, args: tool.getInputRepaired() },
  tool,  // 必须存储工具引用
  status: ApprovalStatus.Pending,
  createdAt: new Date(),
  messageIndex: tool.message?.index,
  description: interrupt?.reviewConfig?.description,
};
addApprovalRequest(request);
```

### Chat.tsx 执行请求
```typescript
const handleExecuteRequest = useCallback(async (request: ApprovalRequest & { tool?: any }) => {
  const tool = request.tool;
  if (!tool) return;
  
  const status = request.status;
  if (status === ApprovalStatus.Approved) {
    tool.sendResumeData({ type: 'approval', action: 'approve' });
  } else if (status === ApprovalStatus.Edited) {
    tool.sendResumeData({ type: 'approval', action: 'approve', args: request.editedArgs });
  } else if (status === ApprovalStatus.Rejected) {
    tool.sendResumeData({ type: 'approval', action: 'reject', message: request.description });
  }
}, []);
```

## 演进历史

1. **HumanApproval 组件**：单个人机审批逻辑封装（approve/edit/reject）
2. **GlobalApprovalPanel**：升级到多 Tab 全局面板
3. **批量执行重设计**：从立即执行改为暂存后统一执行（Ctrl+E）
4. **自动化交互**：自动执行 + 自动跳转下一个 Pending 请求

## 适用场景

- LangGraph UI 工具需要批量审批
- 需要统一管理多个审批请求的 TUI 应用
- 支持快速流转的多步骤交互场景

## 注意事项

1. **快捷键**：macOS 上 `Ctrl+E` 需要按 Control 键而非 Option 键
2. **tool 对象**：必须在添加请求时存储，否则执行失败
3. **类型安全**：使用 `ApprovalStatus.Approved` 枚举而非字符串
4. **组件 key**：tab 切换时使用 `${request.id}-${activeTab}` 确保重新挂载

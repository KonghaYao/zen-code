---
name: finder-sidebar-dynamic-loading-hashrouter-state
description:
    修复 Finder 侧边栏从硬编码路径改为动态加载，解决 HashRouter 中 useSearchParams 导致 hash 清空跳转 dashboard
    的问题。适用于需要在 React Router 中管理组件内部状态的场景，避免 URL 变化影响路由匹配。
tags:
    - finder
    - react-router
    - hash-router
    - state-management
    - dynamic-loading
category: bug-fix
created: 2025-02-22
last_updated: 2026-02-22
priority: medium
context_scope: project
status: completed
completion_date: 2026-02-22
---

# ## 背景

## 背景

Finder 侧边栏使用硬编码的 macOS 系统路径（如
`/Applications`、`~/Desktop`），但后端 API 只允许访问项目根目录，导致大部分侧边栏项目无法打开。另外，侧边栏折叠后缺少展开按钮。

## 决策

1. 移除硬编码的 macOS 系统路径，改为项目相关路径
2. 从后端 API 动态加载根目录下的文件夹列表
3. 添加侧边栏折叠后的展开按钮
4. 改用本地状态管理组件内部 tab，避免 HashRouter 路由冲突

## 原因

- 硬编码路径在后端无法解析为实际文件系统路径
- 需要反映实际项目结构
- `useSearchParams` 在 HashRouter 中会导致 hash 被清空，触发路由跳转

## 实现

### 1. FinderSidebar 动态加载

`src/frontend/components/finder/Sidebar/FinderSidebar.tsx`：

```typescript
// 从硬编码改为动态加载
const [folders, setFolders] = useState<SidebarItem[]>([]);

// 使用 useEffect 从后端 API 加载
useEffect(() => {
    const loadFolders = async () => {
        const result = await apiClient.files.list.query({
            path: '/',
            showHidden: false,
        });
        const folderItems = result.items
            .filter((item) => item.type === 'directory')
            .map((item) => ({
                id: item.name,
                name: item.name,
                path: item.path,
                icon: item.icon || '📁',
                type: 'folder' as const,
            }));
        setFolders(folderItems);
    };
    loadFolders();
}, []);
```

### 2. 本地状态管理（避免 useSearchParams）

```typescript
// 不使用 useSearchParams，改用本地状态
const [activeTab, setActiveTab] = useState('files');

// 切换 tab 时更新本地状态
const handleTabChange = (tab: string) => {
    setActiveTab(tab); // 不会触发路由变化
};
```

## 实施验证 ✅

### 已验证组件

- ✅ `FinderSidebar.tsx` - 动态加载实现已验证
    - 使用 `apiClient.files.list.query()` 从后端加载文件夹
    - 动态创建 `folders` section
    - 包含刷新按钮和加载状态

### 关键实现验证

1. **动态加载** ✅
    - 移除了硬编码的 macOS 系统路径
    - 使用后端 API 动态加载根目录下的文件夹列表
    - 文件路径：`zen-swarm/src/frontend/components/finder/Sidebar/FinderSidebar.tsx:70-110`

2. **侧边栏折叠按钮** ✅
    - 侧边栏头部包含关闭按钮
    - 右侧有刷新文件夹按钮

3. **状态管理** ✅
    - 使用本地 `useState` 管理侧边栏状态
    - 避免使用 `useSearchParams` 导致 hash 清空</arg_value> </tool_call>

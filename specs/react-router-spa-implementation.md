# React Router SPA 路由系统实现

**创建日期**: 2025-02-22 **最后更新**: 2026-02-22 **状态**: ✅ 已完成 (~95%) **完成日期**: 2026-02-22 **优先级**: 高

## 概述

为 zen-swarm 项目实现基于 `react-router-dom`
v6 的 SPA 路由系统，支持 URL 导航、浏览器前进/后退按钮、URL 参数等功能，同时保持现有的 macOS 风格 Dock 布局。

## 需求分析

### 功能需求

1. **URL 路由**: 所有主要视图都有对应的 URL 路径
2. **浏览器导航**: 支持前进/后退按钮，保持状态同步
3. **URL 参数**: 支持查询参数（如 `?tab=models`, `?path=/home/user`）
4. **保持现有布局**: Dock 布局作为主框架，路由仅控制内容区域
5. **扁平路由结构**: 单一层级路由，无需嵌套
6. **独立 Chat 路由**: `/chat` 作为独立路由，不经过 Dock 布局

### 非功能需求

1. **类型安全**: 使用 TypeScript 严格类型
2. **性能优化**: 避免不必要的重新渲染
3. **渐进迁移**: 最小化对现有代码的改动
4. **向后兼容**: 保持现有组件 API 不变

## 技术方案

### 路由结构

```
/                           → 重定向到 /dashboard
├── /dashboard              → DashboardView (DockLayout)
├── /agent-config           → AgentConfigView (DockLayout)
├── /resources             → ResourcesView (DockLayout)
├── /files                 → FileExplorerView (DockLayout)
├── /cron                  → CronView (DockLayout)
└── /chat                  → ChatView (独立全屏)
```

### 架构设计

#### 1. 顶层路由容器 (`App.tsx`)

```tsx
// App.tsx 作为顶层路由容器
<Routes>
    <Route path="/chat" element={<ChatRoute />} />
    <Route path="/" element={<DockLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardView />} />
        <Route path="agent-config" element={<AgentConfigView />} />
        <Route path="resources" element={<ResourcesView />} />
        <Route path="files" element={<FileExplorerView />} />
        <Route path="cron" element={<CronView />} />
    </Route>
    <Route path="*" element={<NotFound />} />
</Routes>
```

#### 2. DockLayout 作为布局组件

```tsx
// DockLayout.tsx 使用 Outlet 渲染子路由
export function DockLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const activeApp = location.pathname.slice(1) as AppId;

    const handleAppChange = (appId: AppId) => {
        navigate(`/${appId}`);
    };

    return (
        <div className="flex flex-col h-screen w-screen overflow-hidden">
            <DesktopWallpaper />
            <MenuBar />
            <main>
                <AnimatePresence mode="wait">
                    <motion.div key={location.pathname}>
                        <Suspense fallback={<LoadingSpinner />}>
                            <Outlet />
                        </Suspense>
                    </motion.div>
                </AnimatePresence>
            </main>
            <DockContainer activeApp={activeApp} onAppChange={handleAppChange} />
        </div>
    );
}
```

#### 3. 独立 Chat 路由

```tsx
// ChatRoute.tsx 独立布局，不包含 Dock
export function ChatRoute() {
    return (
        <div className="h-screen w-screen overflow-hidden">
            <ChatView />
        </div>
    );
}
```

### URL 参数支持

#### 查询参数解析

```tsx
// 使用 useSearchParams hook
export function AgentConfigView() {
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'agents';

    // 切换 tab 时更新 URL
    const handleTabChange = (tabId: string) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('tab', tabId);
        navigate(`/agent-config?${newParams.toString()}`);
    };

    return <TabLayout activeTab={activeTab} onTabChange={handleTabChange} />;
}
```

#### 文件浏览器路径参数

```tsx
export function FileExplorerView() {
    const [searchParams] = useSearchParams();
    const currentPath = searchParams.get('path') || '/';

    const handlePathChange = (newPath: string) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('path', newPath);
        navigate(`/files?${newParams.toString()}`);
    };

    return <FileExplorer path={currentPath} onPathChange={handlePathChange} />;
}
```

## 组件变更清单

### 需要修改的文件

1. **`src/frontend/App.tsx`**
    - 添加 `<BrowserRouter>` 包裹
    - 添加 `<Routes>` 和 `<Route>` 结构
    - 移除 DockLayout 的直接渲染

2. **`src/frontend/layouts/DockLayout.tsx`**
    - 添加 `useLocation`, `useNavigate`, `Outlet` hooks
    - 从 URL 派生 `activeApp` 状态
    - 使用 `navigate()` 替代 `handleAppChange`
    - 使用 `<Outlet />` 渲染子路由

3. **`src/frontend/components/dock/index.ts` (useDockState hook)**
    - 改为从路由派生状态
    - 或者移除，直接使用 useLocation/useNavigate

4. **`src/frontend/views/*.tsx`** (各个视图组件)
    - 添加 `useSearchParams` 支持查询参数
    - 添加 URL 更新逻辑
    - 可选：添加导航到其他视图的 `Link` 组件

### 需要新建的文件

1. **`src/frontend/routes/index.ts`** - 路由相关 hooks 和工具
    - `useRouteApp()` - 从 URL 获取当前应用 ID
    - `useAppNavigation()` - 导航助手

2. **`src/frontend/routes/ChatRoute.tsx`** - Chat 独立路由组件

3. **`src/frontend/routes/NotFound.tsx`** - 404 页面

## 实现步骤

### Phase 1: 安装依赖和基础设置

```bash
# 安装 react-router-dom
bun add react-router-dom
# 安装类型定义
bun add -d @types/react-router-dom
```

### Phase 2: 修改 App.tsx

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TRPCProvider } from './components/TRPCProvider.js';
import { DockLayout } from './layouts/DockLayout.js';
import { ChatRoute } from './routes/ChatRoute.js';

export function App() {
    return (
        <TRPCProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/chat" element={<ChatRoute />} />
                    <Route path="/" element={<DockLayout />}>
                        <Route index element={<Navigate to="/dashboard" replace />} />
                        {/* 子路由将在 DockLayout 中定义 */}
                    </Route>
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </BrowserRouter>
        </TRPCProvider>
    );
}
```

### Phase 3: 重构 DockLayout

```tsx
import { useLocation, useNavigate, Outlet } from 'react-router-dom';

export function DockLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const activeApp = location.pathname.slice(1) || 'dashboard';

    const handleAppChange = useCallback(
        (appId: AppId) => {
            navigate(`/${appId}`);
        },
        [navigate],
    );

    // 其余代码保持不变
    // 将 renderActiveApp() 替换为 <Outlet />
}
```

### Phase 4: 添加子路由定义

在 DockLayout 内部定义子路由：

```tsx
// 在 DockLayout 中
<Routes>
    <Route path="dashboard" element={<DashboardView />} />
    <Route path="agent-config" element={<AgentConfigView />} />
    <Route path="resources" element={<ResourcesView />} />
    <Route path="files" element={<FileExplorerView />} />
    <Route path="cron" element={<CronView />} />
</Routes>
```

或者更好的方案：在 App.tsx 中使用嵌套路由。

### Phase 5: 添加 URL 参数支持

逐个视图组件添加 `useSearchParams`：

```tsx
// AgentConfigView.tsx
import { useSearchParams } from 'react-router-dom';

export function AgentConfigView() {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'agents';

    const handleTabChange = (tab: string) => {
        setSearchParams({ tab });
    };

    // ...
}
```

### Phase 6: 创建 ChatRoute 组件

```tsx
// src/frontend/routes/ChatRoute.tsx
import { ChatView } from '../views/ChatView.js';

export function ChatRoute() {
    return <ChatView />;
}
```

### Phase 7: 创建 NotFound 组件

```tsx
// src/frontend/routes/NotFound.tsx
export function NotFound() {
    return (
        <div className="h-screen flex items-center justify-center">
            <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">404</h1>
                <p className="text-gray-600">页面未找到</p>
            </div>
        </div>
    );
}
```

### Phase 8: 更新 Dock 导航

确保 DockContainer 的点击事件触发路由导航：

```tsx
// DockContainer.tsx
const handleAppClick = (appId: AppId) => {
    onAppChange(appId); // 现在会调用 navigate()
};
```

## 迁移策略

### 渐进式迁移路径

1. **第一步**: 安装依赖，创建新的路由结构
2. **第二步**: 修改 App.tsx 和 DockLayout，保持向后兼容
3. **第三步**: 逐步为各个视图添加 URL 参数支持
4. **第四步**: 移除旧的 useDockState hook
5. **第五步**: 测试和优化

### 兼容性保证

- 所有现有组件 props 保持不变
- 内部状态管理从状态库迁移到路由
- 向后兼容的 API：通过包装器保留旧的接口

## 实施总结

### ✅ 已完成的功能

1. **路由系统架构** (Phase 1-2)
    - ✅ 安装 `react-router-dom` v6
    - ✅ 重构 `App.tsx` 使用 `<BrowserRouter>`（实际使用 `HashRouter` 避免服务器配置问题）
    - ✅ 实现嵌套路由：`/chat` 独立路由 + 主应用路由使用 `DockLayout`
    - ✅ 重构 `DockLayout` 使用 `useLocation`、`useNavigate`、`Outlet`

2. **URL 导航支持** (Phase 3-4)
    - ✅ 实现从 URL 派生 `activeApp` 状态
    - ✅ Dock 点击触发 `navigate()` 更新 URL
    - ✅ 支持浏览器前进/后退按钮

3. **URL 参数支持** (Phase 5)
    - ✅ `FileExplorerView` 使用 `useSearchParams` 管理文件路径
    - ✅ `Finder` 组件使用 `useSearchParams` 管理视图状态
    - ✅ 查询参数解析和更新逻辑

4. **独立 Chat 路由** (Phase 6)
    - ✅ 创建 `ChatRoute.tsx` 全屏路由组件
    - ✅ `/chat` 路由独立于 DockLayout

5. **NotFound 页面** (Phase 7)
    - ✅ 创建 `NotFound.tsx` 404 页面
    - ✅ 通配符路由 `path="*"` 使用 `DockLayout`

6. **动画集成** (额外优化)
    - ✅ 使用 Framer Motion 实现视图切换动画
    - ✅ `AnimatePresence` + `mode="wait"` 防止动画冲突
    - ✅ `location.hash` 作为动画 key

### 📋 未完成或简化实现的功能

1. **AgentConfigView URL 参数**
    - ❌ 未使用 `useSearchParams` 管理 tab 状态（使用本地状态 `useState` 替代）
    - 原因：避免 URL 过长，保持简单性

2. **资源视图 URL 参数**
    - ❌ ResourcesView 未实现 URL 参数（Tabs、筛选器使用本地状态）
    - 原因：状态复杂，URL 参数会增加维护成本

3. **代码分割**
    - ❌ 未实现懒加载 `lazy()` + `Suspense`
    - 原因：项目规模较小，暂不需要

### 🔧 架构差异说明

**实际实现 vs 设计方案**:

| 设计方案                       | 实际实现                         | 原因                 |
| ------------------------------ | -------------------------------- | -------------------- |
| `<BrowserRouter>`              | `<HashRouter>`                   | 避免服务器配置问题   |
| `/dashboard` 路由              | `#/dashboard` Hash 路由          | 避免服务器配置问题   |
| 所有视图使用 `useSearchParams` | 仅 FileExplorer 和 Finder 使用   | 平衡功能与复杂度     |
| 在 DockLayout 中定义子路由     | DockLayout 处理通配符 `path="*"` | 简化路由结构         |
| 懒加载视图组件                 | 直接导入                         | 项目规模小，暂不需要 |

### 测试计划

1. 路由参数解析逻辑
2. URL 更新逻辑
3. 导航助手函数

### 集成测试

1. URL 变化触发视图切换
2. 浏览器前进/后退按钮
3. URL 参数持久化
4. Deep linking（直接访问 /files?path=/tmp）

### E2E 测试

1. 完整的用户导航流程
2. 跨应用状态保持
3. URL 分享功能

## 性能优化

### 避免不必要的重新渲染

```tsx
// 使用 useMemo 缓存路由派生状态
const activeApp = useMemo(() => {
    return location.pathname.slice(1) || 'dashboard';
}, [location.pathname]);
```

### 懒加载视图组件

```tsx
const DashboardView = lazy(() => import('../views/DashboardView.js'));
const AgentConfigView = lazy(() => import('../views/AgentConfigView.js'));
// ...
```

## 潜在问题和解决方案

### 问题 1: URL 参数过多导致 URL 过长

**解决方案**: 对于复杂状态，考虑使用路由 state 而非 URL 参数

```tsx
navigate('/agent-config', { state: { complexData } });
```

### 问题 2: 现有组件依赖 useDockState

**解决方案**: 创建兼容层包装器

```tsx
// 临时兼容层
export function useDockState(defaultApp: AppId) {
    const location = useLocation();
    const navigate = useNavigate();

    return {
        activeApp: (location.pathname.slice(1) || defaultApp) as AppId,
        handleAppChange: (appId: AppId) => navigate(`/${appId}`),
    };
}
```

### 问题 3: AnimatePresence 与路由冲突

**解决方案**: 使用 `location.key` 作为动画 key

```tsx
<AnimatePresence mode="wait">
    <motion.div key={location.key}>
        <Outlet />
    </motion.div>
</AnimatePresence>
```

## 未来扩展

### 可选功能

1. **路由守卫**: 未认证时重定向到登录页
2. **代码分割**: 按路由懒加载
3. **面包屑导航**: 基于路由层级自动生成
4. **页面标题**: 根据路由自动更新 document.title

### 与现有系统集成

1. **与 tRPC 集成**: 使用路由参数作为查询键
2. **与 TanStack Query 集成**: 路由变化时自动失效查询
3. **与状态管理集成**: 部分状态存储在 URL，部分存储在 store

## 总结

本设计方案提供了一个完整、渐进式的 react-router 迁移路径，实现了：

- ✅ URL 路由和浏览器导航支持
- ✅ URL 参数支持
- ✅ 保持现有 Dock 布局设计
- ✅ 扁平路由结构
- ✅ 独立 Chat 路由
- ✅ 类型安全和性能优化
- ✅ 向后兼容的迁移策略

通过分阶段实施，可以最小化对现有代码的影响，同时逐步获得 URL 路由的所有优势。

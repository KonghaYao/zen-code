# zen-swarm File Explorer - VSCode 风格三栏布局

## 一、项目概述

将 zen-swarm 的文件系统改造为类似 VSCode 的三栏布局工具：

- **左侧**：文件夹展示区（文件树）
- **中间**：预览区（文件内容预览）
- **右侧**：多功能展示区（搜索结果等）

## 二、需求收集结果

| 需求项     | 用户选择                                           |
| ---------- | -------------------------------------------------- |
| 目标平台   | zen-swarm Web UI                                   |
| 预览内容   | 文件内容（代码/文本），超过 1MB 显示"超过大小"提示 |
| 右侧面板   | 搜索结果（使用现有的 search-file-rg）              |
| 搜索范围   | 仅当前项目文件                                     |
| 文件树功能 | 多级目录展开/折叠                                  |
| 文件树信息 | 仅显示文件名                                       |
| 设计风格   | Organic/Natural（温暖浅色、赤陶色品牌色）          |

## 三、布局结构

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Toolbar: 视图切换、新建、刷新等]                                     │
├────────────────┬─────────────────────────────┬──────────────────────┤
│                │                             │                      │
│   File Tree    │       Preview Panel         │    Search Panel      │
│   (左侧)       │       (中间预览区)           │    (右侧)            │
│                │                             │                      │
│   📁 src       │  ┌─────────────────────┐    │  🔍 搜索结果          │
│   ├─📁 api     │  │                     │    │  ├─ file1.ts:10      │
│   │ └─📄 x.ts  │  │   文件内容预览       │    │  ├─ file2.ts:25      │
│   ├─📁 views   │  │   (代码高亮)         │    │  └─ file3.ts:42      │
│   └─📄 main.ts │  │                     │    │                      │
│                │  │   超过1MB显示:       │    │  [search-file-rg]    │
│                │  │   "文件过大无法预览"  │    │                      │
│                │  └─────────────────────┘    │                      │
│                │                             │                      │
│  Width: 15-25% │  Width: 50-60%              │  Width: 15-25%       │
│  (可拖拽调整)   │  (自适应)                   │  (可拖拽调整)         │
└────────────────┴─────────────────────────────┴──────────────────────┘
```

## 四、功能规格

### 4.1 左侧：文件树面板 (File Tree Panel)

#### 4.1.1 文件树展示

- **多级目录结构**: 递归展示文件夹和文件
- **展开/折叠**: 点击文件夹图标展开或折叠子目录
- **仅显示文件名**: 不显示文件大小、修改时间等额外信息
- **文件图标**: 根据文件类型显示不同图标（使用现有图标系统）

#### 4.1.2 交互功能

- **单击选中**: 选中文件/文件夹，中间区显示预览
- **双击展开**: 双击文件夹展开/折叠
- **虚拟滚动**: 处理大型目录的性能问题

#### 4.1.3 状态管理

```typescript
interface FileTreeState {
    expandedPaths: Set<string>; // 已展开的路径
    selectedPath: string | null; // 当前选中的路径
    rootPath: string; // 项目根路径
}
```

### 4.2 中间：预览面板 (Preview Panel)

#### 4.2.1 文件内容预览

- **代码高亮**: 使用代码高亮库（如 Prism.js / Shiki）
- **文本文件**: 直接显示内容
- **文件大小限制**: 超过 1MB 显示"文件过大，无法预览"提示
- **不支持类型**: 显示"该文件类型不支持预览"

#### 4.2.2 预览状态

```typescript
interface PreviewState {
    content: string | null; // 文件内容
    language: string; // 语言类型（用于高亮）
    fileSize: number; // 文件大小（字节）
    isLargeFile: boolean; // 是否超过大小限制
    isBinary: boolean; // 是否为二进制文件
    isLoading: boolean; // 加载状态
}
```

#### 4.2.3 文件大小处理逻辑

```typescript
const MAX_PREVIEW_SIZE = 1 * 1024 * 1024; // 1MB

function shouldPreviewFile(file: FileItem): boolean {
    // 不预览的情况
    if (file.size > MAX_PREVIEW_SIZE) return false;
    if (isBinaryFile(file)) return false;
    return true;
}
```

### 4.3 右侧：搜索面板 (Search Panel)

#### 4.3.1 搜索功能

- **使用现有 search-file-rg**: 集成 ripgrep 搜索工具
- **搜索范围**: 仅当前项目文件
- **实时搜索**: 输入时自动搜索（带防抖）

#### 4.3.2 搜索结果展示

- **文件路径**: 显示匹配文件路径
- **行号**: 显示匹配行的行号
- **上下文**: 可选显示匹配行的上下文
- **点击跳转**: 点击结果跳转到对应位置

#### 4.3.3 搜索状态

```typescript
interface SearchState {
    query: string; // 搜索关键词
    results: SearchResult[]; // 搜索结果
    isSearching: boolean; // 搜索状态
    selectedResult: SearchResult | null; // 选中的结果
}

interface SearchResult {
    filePath: string;
    lineNumber: number;
    lineContent: string;
    matchStart: number;
    matchEnd: number;
}
```

### 4.4 工具栏 (Toolbar)

- **新建文件**: 创建新文件
- **新建文件夹**: 创建新文件夹
- **刷新**: 刷新文件树
- **面板切换**: 显示/隐藏左右面板

## 五、技术架构

### 5.1 后端 API (tRPC)

扩展现有的 `files` router：

```typescript
// zen-swarm/src/api/files.ts
filesRouter = router({
  // 现有 API
  list: procedure.input(ListInput).query(...),
  stat: procedure.input(StatInput).query(...),

  // 新增 API
  tree: procedure.input(TreeInput).query(...)      // 获取文件树（递归）
  readFile: procedure.input(ReadInput).query(...)  // 读取文件内容（用于预览）
  search: procedure.input(SearchInput).query(...)  // 搜索文件（调用 search-file-rg）
})

// 类型定义
interface TreeInput {
  path: string;
  maxDepth?: number;        // 最大递归深度
  excludePatterns?: string[]; // 排除模式（node_modules 等）
}

interface ReadInput {
  path: string;
  maxSize?: number;         // 最大读取大小，默认 1MB
}

interface SearchInput {
  query: string;
  path: string;             // 搜索根路径
  filePattern?: string;     // 文件名模式
}
```

### 5.2 前端组件

```
zen-swarm/src/frontend/
├── views/
│   └── FileExplorerView.tsx        # 主视图（三栏布局）
├── components/
│   └── fileExplorer/
│       ├── FileTree/
│       │   ├── FileTree.tsx        # 文件树主组件
│       │   ├── TreeNode.tsx        # 树节点组件
│       │   └── TreeIcon.tsx        # 文件/文件夹图标
│       ├── Preview/
│       │   ├── PreviewPanel.tsx    # 预览面板主组件
│       │   ├── CodePreview.tsx     # 代码预览（带高亮）
│       │   └── LargeFileTip.tsx    # 大文件提示组件
│       ├── Search/
│       │   ├── SearchPanel.tsx     # 搜索面板主组件
│       │   ├── SearchInput.tsx     # 搜索输入框
│       │   └── SearchResult.tsx    # 搜索结果列表
│       └── Toolbar.tsx             # 工具栏
```

### 5.3 布局组件

```tsx
// FileExplorerView.tsx
function FileExplorerView() {
    return (
        <div className="file-explorer-layout">
            <Toolbar />
            <div className="file-explorer-content">
                <ResizablPanel defaultWidth={20} minWidth={15} maxWidth={30}>
                    <FileTree />
                </ResizablPanel>
                <div className="preview-container">
                    <PreviewPanel />
                </div>
                <ResizablPanel defaultWidth={20} minWidth={15} maxWidth={30} side="right">
                    <SearchPanel />
                </ResizablPanel>
            </div>
        </div>
    );
}
```

### 5.4 状态管理

使用 React Context 或 Zustand 管理全局状态：

```typescript
// stores/fileExplorerStore.ts
interface FileExplorerStore {
    // 文件树状态
    tree: TreeNode[];
    expandedPaths: Set<string>;
    selectedPath: string | null;

    // 预览状态
    preview: PreviewState;

    // 搜索状态
    search: SearchState;

    // 面板状态
    leftPanelVisible: boolean;
    rightPanelVisible: boolean;

    // Actions
    expandPath: (path: string) => void;
    collapsePath: (path: string) => void;
    selectPath: (path: string) => void;
    setSearchQuery: (query: string) => void;
    togglePanel: (panel: 'left' | 'right') => void;
}
```

## 六、设计规范

### 6.1 Organic/Natural 风格

| 元素     | 样式                   |
| -------- | ---------------------- |
| 主色调   | 温暖浅色背景 `#faf8f5` |
| 品牌色   | 赤陶色 `#d4765c`       |
| 面板背景 | `#f5f3f0`              |
| 边框色   | `#e8e4df`              |
| 圆角     | `0.5rem - 1rem`        |
| 阴影     | 温暖琥珀色阴影         |
| 动画     | 自然弹性动画           |

### 6.2 布局尺寸

| 元素       | 尺寸                    |
| ---------- | ----------------------- |
| 左侧面板   | 15-25% 宽度，可拖拽调整 |
| 中间面板   | 自适应剩余空间          |
| 右侧面板   | 15-25% 宽度，可拖拽调整 |
| 工具栏高度 | 48px                    |
| 文件树行高 | 28px                    |

## 七、实现状态

### ✅ Phase 1: 基础架构（已完成）

- [x] 创建 FileExplorerView 主视图
- [x] 实现三栏布局结构（VSCode 风格）
- [x] 添加可拖拽调整大小的面板组件（ResizablePanel）
- [x] 支持布局模式切换（VSCode / Legacy）

### ✅ Phase 2: 文件树功能（已完成）

- [x] 实现 FileTree 组件（多级目录展开/折叠）
- [x] 后端添加 `tree` API（递归获取文件树）
- [x] 实现展开/折叠功能
- [x] 添加文件图标

### ✅ Phase 3: 预览功能（已完成）

- [x] 实现 PreviewPanel 组件
- [x] 后端添加 `readFile` API
- [x] 集成代码预览（行号显示）
- [x] 处理大文件提示（超过 1MB）
- [x] 处理二进制文件提示

### ✅ Phase 4: 搜索功能（已完成）

- [x] 实现 SearchPanel 组件
- [x] 集成 ripgrep 搜索（后端 `search` API）
- [x] 实现搜索结果展示（高亮匹配）
- [x] 添加点击跳转功能
- [x] 支持键盘导航（上下键 + Enter）

### ✅ Phase 5: 优化（已完成）

- [x] 构建检查通过
- [x] 面板可见性切换
- [x] 防抖搜索

## 八、已创建的文件

### 后端 API

- `zen-swarm/src/api/files.ts` - 新增 `tree`, `readFile`, `search` API

### 前端组件

- `zen-swarm/src/frontend/views/FileExplorerView.tsx` - 主视图（三栏布局）
- `zen-swarm/src/frontend/components/fileExplorer/FileTree/FileTree.tsx` - 文件树组件
- `zen-swarm/src/frontend/components/fileExplorer/Preview/PreviewPanel.tsx` - 预览面板
- `zen-swarm/src/frontend/components/fileExplorer/Search/SearchPanel.tsx` - 搜索面板

## 九、后续扩展（可选）

- 现有文件 API: `zen-swarm/src/api/files.ts`
- 搜索工具: `search-file-rg`
- 设计系统: `.claude/memories/zen-swarm-frontend-design/MEMORY.md`

## 九、后续扩展（可选）

- [ ] 右键菜单（新建/删除/重命名）
- [ ] 文件拖拽移动
- [ ] 多标签页预览
- [ ] 文件搜索过滤
- [ ] Git 状态显示

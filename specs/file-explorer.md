# zen-swarm File Explorer - 需求文档

## 一、项目概述

为 zen-swarm 创建一个类似 Windows 文件管理器的文件夹视图，能够访问当前服务器上的文件系统。

## 二、需求收集结果

| 需求项    | 用户选择                                                      |
| --------- | ------------------------------------------------------------- |
| 核心功能  | 浏览文件夹/子文件夹、创建/删除/重命名文件、文件上传/下载      |
| 设计风格  | Organic/Natural（温暖浅色、赤陶色品牌色、圆角、自然弹性动画） |
| 文件范围  | 整个服务器文件系统（需安全限制）                              |
| 展示方式  | 支持列表/网格切换                                             |
| 上传/下载 | 拖拽上传 + 点击下载                                           |
| 搜索功能  | 不需要                                                        |
| 后端 API  | zen-swarm 现有的 tRPC 路由                                    |
| 图标      | 基础图标（按文件类型），使用外部 CDN                          |

## 三、功能规格

### 3.1 文件浏览

- **路径导航**: 面包屑导航，支持快速跳转
- **文件列表**: 显示文件名、大小、修改时间、类型
- **文件夹进入**: 双击或单击进入子文件夹
- **视图切换**: 列表视图 / 网格视图切换按钮
- **排序**: 按名称/大小/修改时间/类型排序

### 3.2 文件操作

- **创建**: 创建新文件夹、创建新文件
- **删除**: 删除文件或文件夹（需确认）
- **重命名**: 重命名文件或文件夹

### 3.3 文件上传/下载

- **拖拽上传**: 拖拽文件到指定区域上传
- **点击下载**: 点击文件触发下载

### 3.4 安全策略

- **根目录限制**: 默认限制在项目根目录，可配置允许的根目录列表
- **路径验证**: 阻止路径遍历攻击（`../`）
- **隐藏文件**: 可选择是否显示隐藏文件（以 `.` 开头）

## 四、技术架构

### 4.1 后端 API (tRPC)

```
zen-swarm/src/api/files.ts
```

#### Router 结构

```typescript
filesRouter = router({
  // 浏览
  list: procedure.input({ path: string }).query(...),     // 列出目录内容
  stat: procedure.input({ path: string }).query(...),     // 获取文件信息

  // 操作
  createFolder: procedure.input({ path: string }).mutation(...),
  createFile: procedure.input({ path: string, content?: string }).mutation(...),
  delete: procedure.input({ path: string }).mutation(...),
  rename: procedure.input({ oldPath: string, newPath: string }).mutation(...),

  // 上传/下载
  upload: procedure.input({ path: string, content: string, encoding?: string }).mutation(...),
  download: procedure.input({ path: string }).query(...),
})
```

### 4.2 前端组件

```
zen-swarm/src/frontend/
├── views/
│   └── FileExplorerView.tsx      # 主视图
├── components/
│   └── fileExplorer/
│       ├── FileList.tsx          # 文件列表（支持列表/网格）
│       ├── FileGrid.tsx          # 网格视图
│       ├── BreadcrumbNav.tsx     # 面包屑导航
│       ├── FileItem.tsx          # 文件项
│       ├── FileIcon.tsx          # 文件图标组件
│       ├── DropZone.tsx          # 拖拽上传区域
│       ├── CreateFileDialog.tsx  # 创建文件对话框
│       └── Toolbar.tsx           # 工具栏（视图切换、排序等）
```

### 4.3 类型定义

```typescript
interface FileItem {
    name: string;
    path: string;
    type: 'file' | 'directory';
    size: number;
    modifiedAt: Date;
    isHidden: boolean;
    extension?: string;
}

interface FileListOptions {
    path: string;
    showHidden?: boolean;
    sortBy?: 'name' | 'size' | 'modifiedAt' | 'type';
    sortOrder?: 'asc' | 'desc';
}
```

## 五、设计风格 (Organic/Natural)

| 元素   | 样式           |
| ------ | -------------- |
| 主色调 | 温暖浅色背景   |
| 品牌色 | 赤陶色 #d4765c |
| 圆角   | 0.5-2rem       |
| 阴影   | 温暖琥珀色阴影 |
| 动画   | 自然弹性动画   |
| 字体   | Nunito         |

## 六、实现计划

1. **Phase 1: 后端 API**
    - 创建 files.ts router
    - 实现文件系统操作
    - 添加安全验证

2. **Phase 2: 基础前端**
    - 创建 FileExplorerView
    - 实现文件列表展示
    - 面包屑导航

3. **Phase 3: 交互功能**
    - 视图切换
    - 创建/删除/重命名
    - 上传/下载

4. **Phase 4: 优化**
    - 拖拽上传
    - 加载状态
    - 错误处理

## 七、安全考虑

- **路径遍历防护**: 验证所有路径，阻止 `../` 攻击
- **根目录限制**: 配置允许访问的根目录白名单
- **文件大小限制**: 限制上传文件大小
- **权限检查**: 检查文件系统权限

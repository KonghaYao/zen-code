# Postman 面板增强：文件夹存储 + curl/http 导入导出

**状态**: 规划中  
**日期**: 2026-03-14  
**关联**: `specs/postman-design.md`（原始设计）

---

## 背景

当前 Postman 面板使用 SQLite（Collection + Request 模型）管理用例，缺少：

1. **文件夹层级**：Collection 内只有扁平请求列表，无法多层分组
2. **自动归档**：请求执行后不会自动存档到默认分组
3. **快速导入**：无法粘贴 curl 一键创建请求
4. **格式转换**：不支持 `.http` 文件格式的双向互转

本 spec 定义这四个方向的增强，与现有架构保持兼容。

---

## 一、文件夹存储系统

### 1.1 目标

- 在 Collection 内支持多层文件夹（Folder）
- 用例（Request）可挂载在 Collection 根或任意 Folder 下
- 新请求执行后自动存档到 `default/YYYY-MM-DD` 文件夹（若未手动指定位置）
- 用户可手动：新建文件夹、重命名、删除、拖拽移动

### 1.2 存储位置

```
~/.zen-code/http/           ← 全局存储，所有 workspace 共享
├── collections.json        ← 集合元数据（name, id, description）
├── folders.json            ← 文件夹树
├── requests/               ← 每个请求独立文件
│   └── {requestId}.json
├── environments.json       ← 环境变量
└── history/                ← 执行历史（按日期分目录）
    └── 2026-03-14/
        └── {historyId}.json
```

> **不再使用 SQLite**（或提供迁移路径），改为文件系统存储，便于手动编辑、版本管理。

### 1.3 数据模型变更

#### 新增 `Folder`

```ts
interface Folder {
    id: string;
    collection_id: string;
    parent_folder_id: string | null; // null = Collection 根
    name: string;
    sort_order: number;
    created_at: string;
    updated_at: string;
}
```

#### `SavedRequest` 变更

```diff
interface SavedRequest {
    id: string;
    collection_id: string;
+   folder_id: string | null;  // null = Collection 根，指向 Folder.id
    name: string;
    // ...其余字段不变
}
```

### 1.4 默认归档规则

```
触发时机: 用户点击 Send，且 save_to_history=true
归档逻辑:
  1. 查找或创建 Collection "default"
  2. 查找或创建 Folder name=今日日期 (YYYY-MM-DD)，parent=null
  3. 若请求有 id（已保存），跳过自动归档
  4. 若为临时请求，保存快照到 default/{date}/
```

### 1.5 树形侧边栏 UI

```
Collections Tab:
  ├── [+ New Collection]
  │
  ├── 📁 default
  │   └── 📁 2026-03-14
  │       ├── GET /users
  │       └── POST /login
  │
  └── 📁 My API Tests
      ├── GET /products          ← Collection 根请求
      └── 📁 Auth
          ├── POST /token
          └── DELETE /logout
```

**交互**：

| 操作       | 触发方式                                           |
| ---------- | -------------------------------------------------- |
| 新建文件夹 | 悬浮 Collection/Folder 时显示 `+` 按钮，或右键菜单 |
| 重命名     | 双击名称 inline 编辑                               |
| 删除       | 右键菜单 → Delete（有确认提示）                    |
| 拖拽移动   | HTML5 drag-and-drop，拖到文件夹内或请求同级        |
| 展开/折叠  | 点击文件夹名或 `▶/▼` 箭头                          |

---

## 二、curl 粘贴快速创建

### 2.1 目标

在 URL 输入框或专用"Import"入口，粘贴 curl 命令，自动解析并填充当前请求。

### 2.2 触发方式

- URL 输入框检测到粘贴内容以 `curl ` 开头时，弹出确认提示："检测到 curl 命令，是否导入？"
- 顶部工具栏"Import"按钮 → 下拉 → "Paste cURL"

### 2.3 解析规则

支持常见 curl flags：

| curl flag                                              | 映射字段                    |
| ------------------------------------------------------ | --------------------------- |
| `curl <url>` / `-X <url>`                              | url                         |
| `-X METHOD` / `--request`                              | method                      |
| `-H "Key: Value"` / `--header`                         | headers                     |
| `-d '...'` / `--data` / `--data-raw` / `--data-binary` | body.content (json 或 text) |
| `--data-urlencode`                                     | body (form)                 |
| `-u user:pass`                                         | auth.basic                  |
| `-b "k=v"`                                             | headers Cookie              |
| `--compressed`                                         | 忽略（仅 Accept-Encoding）  |
| `-G` + `-d`                                            | 转为 query_params           |

Content-Type 推断：

```
body 为合法 JSON → body.type = 'json'
-H 含 application/x-www-form-urlencoded → body.type = 'form'
其他 → body.type = 'text'
```

### 2.4 实现位置

```
zen-swarm/src/frontend/utils/curlParser.ts   ← 纯函数解析器（无副作用）
```

接口：

```ts
interface ParsedCurl {
    method: HttpMethod;
    url: string;
    headers: KeyValuePair[];
    query_params: KeyValuePair[];
    auth: AuthConfig;
    body: RequestBody;
}

function parseCurl(curlString: string): ParsedCurl | null;
```

---

## 三、.http 格式支持

### 3.1 目标

支持 [RFC 7230](https://tools.ietf.org/html/rfc7230) + VS Code REST Client 格式的 `.http` 文件双向转换。

### 3.2 `.http` 格式示例

```http
### Get Users
GET https://api.example.com/users?page=1
Authorization: Bearer {{TOKEN}}
Accept: application/json

### Create User
POST https://api.example.com/users
Content-Type: application/json

{
  "name": "Alice",
  "email": "alice@example.com"
}
```

- 以 `###` 分隔多个请求
- 注释行 `# ...`
- 支持 `{{VAR}}` 变量语法

### 3.3 转换方向

| 方向             | 触发方式                            | 说明                                               |
| ---------------- | ----------------------------------- | -------------------------------------------------- |
| curl → 内部用例  | URL 框粘贴 / Import 按钮            | 见第二章                                           |
| .http → 内部用例 | Import → "Import .http file"        | 支持单文件多请求，批量导入到选定 Collection/Folder |
| 内部用例 → curl  | 请求右键 → "Copy as cURL"           | 复制到剪贴板                                       |
| 内部用例 → .http | Collection 右键 → "Export as .http" | 将整个 Collection 导出为单个 .http 文件            |

### 3.4 实现位置

```
zen-swarm/src/frontend/utils/httpFileParser.ts    ← .http 解析
zen-swarm/src/frontend/utils/curlExporter.ts      ← 导出为 curl
zen-swarm/src/frontend/utils/httpFileExporter.ts  ← 导出为 .http
```

接口：

```ts
// 解析 .http 文件内容，返回多个请求
function parseHttpFile(content: string): ParsedCurl[];

// 将 SavedRequest 导出为 curl 字符串
function exportToCurl(request: SavedRequest, env?: Environment): string;

// 将 Collection + Requests 导出为 .http 内容
function exportToHttpFile(collection: Collection, requests: SavedRequest[], folders?: Folder[]): string;
```

---

## 四、UI 布局调整

### 4.1 新布局（左侧树形侧边栏）

```
┌─────────────────────────────────────────────────────────────┐
│  Top bar: [RequestName] [●] [Env Badge] [Save] [+ New]      │
│           [Import ▼]                                         │
├────────────────┬────────────────────────┬───────────────────┤
│ Collections    │ URL bar + Send          │ Response          │
│ ──────────── │ ──────────────────────── │ ─────────────── │
│ 🔍 Search    │ [METHOD] [URL........] [Send]               │
│ [+ Folder]   │ Tabs: Params|Headers|Auth|Body               │
│              │                          │ Status / Headers  │
│ ▶ 📁 default│ [Params editor ...]      │ Body viewer       │
│   ▼ 📁 Today │                          │                   │
│     GET /api │                          │                   │
│ ▼ 📁 My API  │                          │                   │
│   GET /users │                          │                   │
│   ▶ 📁 Auth  │                          │                   │
│              │                          │                   │
│ ──────────── │                          │                   │
│ History tab  │                          │                   │
└────────────────┴────────────────────────┴───────────────────┘
```

侧边栏宽度从 `w-56 (224px)` 调整为 `w-64 (256px)` 以容纳树形缩进。

### 4.2 Import 下拉菜单

顶部新增 `Import` 按钮（下拉）：

```
Import ▼
├── Paste cURL
└── Import .http file
```

### 4.3 右键菜单（Context Menu）

文件夹节点：

```
New Request
New Subfolder
──────────────
Rename
──────────────
Export as .http
──────────────
Delete
```

请求节点：

```
Open
Duplicate
──────────────
Move to folder...
Copy as cURL
──────────────
Delete
```

---

## 五、后端 API 变更（tRPC）

### 新增 Folder 相关过程

| 过程           | 类型     | 说明                             |
| -------------- | -------- | -------------------------------- |
| `listFolders`  | query    | 按 collection_id 返回所有文件夹  |
| `createFolder` | mutation | 创建文件夹                       |
| `updateFolder` | mutation | 重命名 / 移动 (parent_folder_id) |
| `deleteFolder` | mutation | 删除（级联删除子文件夹和请求）   |
| `moveRequest`  | mutation | 移动请求到指定 folder_id         |

### 修改 `send` 过程

```diff
SendRequestInput {
+  auto_save_folder?: boolean;  // true = 自动归档到 default/{date}
}
```

### 修改 `listRequests`

```diff
- listRequests(collectionId: string): SavedRequest[]
+ listRequests(input: {
+   collection_id: string;
+   folder_id?: string | null;  // null = 返回所有（含子文件夹）
+ }): { folders: Folder[], requests: SavedRequest[] }
```

---

## 六、文件系统存储实现

存储类 `FileSystemPostmanStorage`，读写 `~/.zen-code/http/`：

```
zen-swarm/src/postman/fileSystemStorage.ts
```

> 项目仍在开发阶段，直接替换 SQLite 实现，**无需迁移逻辑**，移除现有 SQLite 相关代码即可。

---

## 七、实现顺序

```
Phase 1: 基础文件夹支持
  ├── 1. 新增 Folder 数据模型和存储
  ├── 2. tRPC Folder CRUD API
  ├── 3. 树形 CollectionSidebar 组件重写
  └── 4. 拖拽移动（dnd-kit 或 HTML5 原生）

Phase 2: 自动归档
  ├── 5. send 时 auto_save_folder 逻辑
  └── 6. default/{date} 文件夹自动创建

Phase 3: curl 导入
  ├── 7. curlParser.ts 纯函数实现
  ├── 8. URL 框粘贴检测
  └── 9. Import → Paste cURL 入口

Phase 4: .http 格式
  ├── 10. httpFileParser.ts 解析器
  ├── 11. curlExporter.ts / httpFileExporter.ts
  ├── 12. Import .http file 入口（文件选择器）
  └── 13. 右键 Copy as cURL / Export as .http

Phase 5: 文件系统存储
  └── 14. 移除 SQLite 代码，实现 FileSystemPostmanStorage
```

---

## 八、受影响文件

### 新增

```
zen-swarm/src/frontend/utils/curlParser.ts
zen-swarm/src/frontend/utils/curlExporter.ts
zen-swarm/src/frontend/utils/httpFileParser.ts
zen-swarm/src/frontend/utils/httpFileExporter.ts
zen-swarm/src/frontend/components/postman/FolderTree.tsx
zen-swarm/src/frontend/components/postman/ImportMenu.tsx
zen-swarm/src/frontend/components/postman/ContextMenu.tsx
zen-swarm/src/postman/fileSystemStorage.ts
```

### 修改

```
zen-swarm/src/postman/types.ts                      ← 新增 Folder 类型
zen-swarm/src/postman/storage.ts                    ← Folder CRUD
zen-swarm/src/api/postman.ts                        ← Folder tRPC 过程
zen-swarm/src/frontend/types/postman.ts             ← 同步类型
zen-swarm/src/frontend/hooks/usePostman.ts          ← useFolders, useMoveRequest
zen-swarm/src/frontend/views/Postman/index.tsx      ← Import 按钮, 布局微调
zen-swarm/src/frontend/components/postman/CollectionSidebar.tsx ← 树形重写
```

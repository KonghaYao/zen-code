# Postman 交互体验优化方案

## 背景与问题

当前 postman 实现已具备基本功能（集合管理、环境变量、历史记录、认证、多种请求体格式），但交互体验存在以下核心问题：

### 1. 单标签页模式 — 最严重的交互痛点

当前只支持同时编辑一个请求。切换请求会**丢失当前未保存的编辑状态**。没有多标签页支持意味着：

- 无法并排对比两个请求
- 快速切换集合中不同请求时，当前工作被打断
- 没有"草稿标签"概念，每次新建请求都会替换当前编辑区

### 2. 请求区域高度固定 — 空间分配不合理

```
maxHeight: '220px', minHeight: '80px'
```

请求参数区域被硬编码为最大 220px，Body 编辑器空间极其有限，无法处理复杂 JSON
payload。响应区域是剩余空间，但请求编辑空间不足时用户体验差。

### 3. Body 编辑器体验差

- Body 区域受限于 220px 上限，JSON 编辑非常不便
- 无语法高亮
- 无 JSON 格式化/压缩快捷操作
- 无错误提示（JSON 语法错误时无反馈）

### 4. 响应面板功能有限

- 响应体无代码高亮
- 无响应体搜索功能
- 无"复制响应"按钮（需手动选择文字）
- 响应与请求无可调节的分割比例

### 5. URL 栏缺少辅助功能

- 无 URL 自动补全/历史建议
- 无请求正在发送的视觉进度反馈（只有按钮文字变 `...`）
- 环境变量 `{{VAR}}` 在 URL 栏无高亮标识

### 6. 集合侧边栏交互粗糙

- 无请求搜索过滤功能（集合大时很难找到特定请求）
- 文件夹拖拽排序未完善
- 新建请求后没有自动聚焦到名称输入框

### 7. 缺少键盘快捷键

- `Cmd+Enter` 不能发送请求（只有 URL 栏 `Enter`）
- 无 `Cmd+S` 保存请求
- 无快速切换标签页快捷键

---

## 优化目标

1. **多标签页**：支持同时打开多个请求，标签可拖拽排序
2. **可拖拽分割面板**：请求区和响应区之间可自由调节比例
3. **增强 Body 编辑器**：语法高亮、JSON 格式化、错误提示
4. **增强响应面板**：高亮、搜索、一键复制
5. **URL 栏增强**：变量高亮、发送进度条
6. **侧边栏搜索**：快速过滤请求
7. **键盘快捷键**：完善常用操作快捷键

---

## 详细设计

### 功能 1：多标签页系统

#### UI 布局变化

```
┌─────────────────────────────────────────────────────────────┐
│  Request name  ●     [ENV]  [Save]  [Import]  [+ New]       │  ← 顶栏不变
├─────────────────────────────────────────────────────────────┤
│  [GET /users ×] [POST /login ×] [● PUT /user ×] [+]         │  ← 新增标签栏
├──────────────┬──────────────────────────────────────────────┤
│  Sidebar     │      Request Editor + Response               │
│              │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

标签栏规则：

- 标签显示：`METHOD /path-末尾`，超长截断为 `GET /users/pr...`
- `●` 标记表示未保存
- `×` 关闭按钮（未保存时关闭弹确认框）
- `+` 按钮新建空白标签
- 标签超出宽度时可左右滚动

#### 状态管理

```ts
// 新增 TabState 类型
interface TabState {
    id: string; // 唯一标签 ID
    request: ActiveRequest; // 当前编辑状态
    response: SendRequestResult | null;
    isSending: boolean;
    requestTab: RequestTab;
    savedRequestId?: string; // 对应已保存请求的 ID（如有）
}

// PostmanView 状态
const [tabs, setTabs] = useState<TabState[]>([createNewTab()]);
const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);
```

#### 打开请求时的行为

- 从侧边栏点击已保存请求：
    - 若该请求已在某个标签中打开，**切换到该标签**（不重复打开）
    - 否则在新标签中打开
- 历史记录加载：始终在**当前激活标签**中加载（与现行逻辑一致）
- `+ New` 按钮：创建新空白标签并激活

---

### 功能 2：可拖拽分割面板（请求区 / 响应区）

#### 当前问题

请求 tab 内容区 `maxHeight: 220px` 硬编码，无法调整。

#### 方案

将中间编辑器区域改为竖向可拖拽分割：

```
┌─────────────────────────────────┐
│  URL bar                        │
├─────────────────────────────────┤
│  [Params] [Headers] [Auth] [Body] │
├─────────────────────────────────┤  ← 可拖拽分隔线（默认 40% / 60%）
│  Request content (可调高度)     │
├─────────────────────────────────┤  ← drag handle
│  Response panel (可调高度)      │
└─────────────────────────────────┘
```

实现方式：

- 使用 `react-resizable-panels` 库（已在 zen-swarm 依赖中检查）
- 或自行实现简单的 drag handle（mousedown + mousemove）
- 分割比例持久化到 `localStorage`：`postman.requestPanelRatio`

---

### 功能 3：增强 Body 编辑器

#### JSON 模式改进

```tsx
// 当 body.type === 'json' 时，替换普通 textarea 为增强编辑器
<JsonBodyEditor
    value={body.content}
    onChange={onChange}
    onFormat={() => {
        /* 格式化 JSON */
    }}
    onMinify={() => {
        /* 压缩 JSON */
    }}
/>
```

功能清单：

- **语法高亮**：使用 `highlight.js` 或轻量级 `prism`，仅加载 JSON 语言包（~10KB）
- **格式化按钮**：`{}` 图标，一键 `JSON.stringify(JSON.parse(val), null, 2)`
- **压缩按钮**：`{}↓` 图标，一键 `JSON.stringify(JSON.parse(val))`
- **实时错误提示**：底部 inline 显示 `Invalid JSON: Unexpected token at pos 42`
- **行号显示**：左侧显示行号（可用 CSS counter 实现，无需额外库）

```
┌─────────────────────────────────────────────┐
│ none  json  form  text  binary              │
├─────────────────────────────────────────────┤
│  [{} Format] [{} Minify]          [JSON ✓] │  ← 工具栏
├─────────────────────────────────────────────┤
│  1 │ {                                      │
│  2 │   "name": "test",                      │
│  3 │   "value": 123                         │
│  4 │ }                                      │
└─────────────────────────────────────────────┘
```

---

### 功能 4：增强响应面板

#### 当前 ResponsePanel 缺失功能

```tsx
// 新增工具栏
<div className="response-toolbar">
    {/* 一键复制响应体 */}
    <button onClick={() => navigator.clipboard.writeText(response.body)}>Copy</button>

    {/* 响应体搜索 */}
    <input placeholder="Search in response..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />

    {/* 格式化切换：Pretty / Raw */}
    <TabGroup value={viewMode} onChange={setViewMode}>
        <Tab value="pretty">Pretty</Tab>
        <Tab value="raw">Raw</Tab>
    </TabGroup>
</div>
```

功能清单：

- **一键复制**：复制响应体到剪贴板，按钮有 2 秒 `Copied!` 反馈
- **搜索高亮**：在响应体中搜索关键词，高亮匹配位置，支持 `Enter` 跳下一处
- **Pretty / Raw 切换**：Pretty 模式对 JSON 响应自动格式化+高亮；Raw 显示原始文本
- **响应头折叠**：响应头默认折叠，点击展开，减少视觉干扰
- **大响应截断**：响应体 > 1MB 时显示警告并只渲染前 100KB（附"Load Full"按钮）

---

### 功能 5：URL 栏增强

#### 环境变量高亮

URL 输入框中 `{{VAR}}` 部分使用不同颜色标识：

```
  https://{{BASE_URL}}/api/users/{{USER_ID}}
            ↑ 绿色高亮（变量已定义）                ↑ 黄色（未定义变量）
```

实现方案：将 `<input>` 替换为带 overlay 的 `contenteditable div`，或使用 `<input>` + 下方 `<div>`
叠加渲染高亮层（仅视觉层）。

注意：contenteditable 方案复杂度高，建议用更简单的 tooltip 方案：鼠标悬停 `{{VAR}}` 时显示当前环境中该变量的实际值。

#### 发送进度条

URL 栏下方添加薄进度条（2px 高度），发送请求时显示动画：

```css
/* 使用 CSS animation 模拟不确定进度 */
.progress-bar {
    height: 2px;
    background: var(--color-primary);
    animation: indeterminate 1.5s ease-in-out infinite;
}
```

---

### 功能 6：侧边栏搜索

#### 当前问题

无搜索功能，集合较多时找请求困难。

#### 方案

在侧边栏顶部（Collections tab 下方）添加搜索框：

```
┌──────────────────────────────┐
│  [Collections] [History]     │
├──────────────────────────────┤
│  🔍 Search requests...       │  ← 新增搜索框
├──────────────────────────────┤
│  ▼ My API Collection         │
│    GET /users                │
│    POST /login               │
│  ▼ Admin APIs                │
│    ...                       │
└──────────────────────────────┘
```

搜索逻辑：

- 实时过滤（无需回车）
- 匹配请求名称 + URL（大小写不敏感）
- 搜索时**自动展开所有集合**，隐藏不匹配的请求
- 搜索词高亮（`<mark>` 标签）
- 清空按钮（`×`）

---

### 功能 7：键盘快捷键

| 快捷键        | 功能                           |
| ------------- | ------------------------------ |
| `Cmd+Enter`   | 发送请求（全局，无论焦点在哪） |
| `Cmd+S`       | 保存当前请求                   |
| `Cmd+T`       | 新建标签页                     |
| `Cmd+W`       | 关闭当前标签页                 |
| `Cmd+[1-9]`   | 切换到第 N 个标签              |
| `Cmd+K`       | 聚焦侧边栏搜索框               |
| `Cmd+Shift+F` | 格式化 Body JSON               |
| `Cmd+L`       | 聚焦 URL 输入框                |

实现：在 `PostmanView` 顶层添加 `useEffect` 监听 `keydown` 事件。

---

## 实施优先级

### P0（核心体验，必做）

1. **多标签页** — 解决最严重的工作流打断问题
2. **可拖拽分割面板** — 解决 Body 编辑器空间不足问题
3. **键盘快捷键** `Cmd+Enter` / `Cmd+S` — 最基本的效率提升

### P1（显著提升）

4. **Body JSON 格式化 + 错误提示** — 高频使用功能
5. **响应面板一键复制 + Pretty/Raw 切换** — 减少手动操作
6. **侧边栏搜索** — 随集合增多变得必要

### P2（进阶体验）

7. **响应体搜索高亮** — 调试大响应时有用
8. **URL 变量高亮/Tooltip** — 减少环境变量错误
9. **发送进度条** — 视觉反馈优化

---

## 文件改动清单

### 修改文件

```
zen-swarm/src/frontend/views/Postman/index.tsx
  - 新增 TabState、tabs、activeTabId 状态
  - 新增标签栏 UI
  - 将 requestTab content 区域改为可拖拽分割

zen-swarm/src/frontend/components/postman/BodyEditor.tsx
  - JSON 模式增加工具栏（格式化/压缩/错误提示）

zen-swarm/src/frontend/components/postman/ResponsePanel.tsx
  - 新增复制按钮、搜索框、Pretty/Raw 切换
  - 响应头默认折叠

zen-swarm/src/frontend/components/postman/CollectionSidebar.tsx
  - 新增搜索框
  - 搜索结果高亮
```

### 新增文件

```
zen-swarm/src/frontend/components/postman/RequestTabs.tsx
  - 标签栏组件，管理标签列表和切换

zen-swarm/src/frontend/components/postman/DragHandle.tsx
  - 可拖拽分割线组件

zen-swarm/src/frontend/hooks/usePostmanTabs.ts
  - 标签页状态管理 Hook

zen-swarm/src/frontend/hooks/usePostmanKeyboard.ts
  - 全局键盘快捷键 Hook
```

---

## 数据持久化

标签页状态**仅在内存中维护**，不做持久化（刷新后恢复空白标签）。这与 Postman/Insomnia 的行为一致，避免过度设计。

分割面板比例持久化到 `localStorage['postman.splitRatio']`。

---

## 不在本次范围内

以下功能暂不实现，留待后续迭代：

- 请求断点/拦截（类似 Charles）
- WebSocket / SSE 支持
- 请求链（Pre-request Script）
- 测试断言（Test Script）
- 请求导出为 OpenAPI
- 团队协作/云同步

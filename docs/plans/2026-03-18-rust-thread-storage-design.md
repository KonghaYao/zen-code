# Rust Agent Thread 存储设计

**日期**: 2026-03-18 **状态**: 已批准

## 背景

当前 Rust agent
TUI 的消息历史仅存在于内存（`App.messages: Vec<ChatMessage>`），TUI 退出后全部丢失。需要设计持久化的 Thread 存储层，支持对话的创建与恢复。

## 目标

- 支持 thread 创建：每次启动可新建一个 thread
- 支持 thread 恢复：TUI 内浏览历史 thread 并选择恢复
- 存储抽象：定义 `ThreadStore` trait，文件系统为首个实现

## 文件布局

```
~/.zen-core/threads/
├── index.json                    # 所有 thread 的元数据索引（摘要列表）
└── <thread_id>/
    ├── meta.json                 # 单个 thread 的完整元数据
    └── messages.jsonl            # 消息流，每行一条 BaseMessage JSON
```

- `index.json`：存所有 thread 的摘要，避免列举时逐目录读取
- `meta.json`：存该 thread 的完整元数据
- `messages.jsonl`：追加写入，每行一条完整 JSON

## Trait 接口

**位置**：`rust-create-agent/src/thread/`

```rust
pub type ThreadId = String;  // UUID v4

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThreadMeta {
    pub id: ThreadId,
    pub title: Option<String>,     // 对话标题（可由第一条消息自动截取）
    pub cwd: String,               // 创建时的工作目录
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub message_count: usize,
}

#[async_trait]
pub trait ThreadStore: Send + Sync {
    async fn create_thread(&self, meta: ThreadMeta) -> Result<ThreadId>;
    async fn append_messages(&self, id: &ThreadId, msgs: &[BaseMessage]) -> Result<()>;
    async fn load_messages(&self, id: &ThreadId) -> Result<Vec<BaseMessage>>;
    async fn load_meta(&self, id: &ThreadId) -> Result<ThreadMeta>;
    async fn update_meta(&self, id: &ThreadId, meta: ThreadMeta) -> Result<()>;
    async fn list_threads(&self) -> Result<Vec<ThreadMeta>>;
    async fn delete_thread(&self, id: &ThreadId) -> Result<()>;
}
```

## 文件系统实现

**位置**：`rust-agent-tui/src/thread/`

```rust
pub struct FilesystemThreadStore {
    base_dir: PathBuf,  // ~/.zen-core/threads/
}
```

各方法语义：

| 方法              | 实现描述                                                        |
| ----------------- | --------------------------------------------------------------- |
| `create_thread`   | 生成 UUID，创建 `<id>/` 目录，写 `meta.json`，更新 `index.json` |
| `append_messages` | append 模式打开 `messages.jsonl`，每条消息序列化成一行          |
| `load_messages`   | 按行读取 `messages.jsonl`，反序列化                             |
| `load_meta`       | 读取 `meta.json`                                                |
| `update_meta`     | 覆写 `meta.json`，同步更新 `index.json` 摘要                    |
| `list_threads`    | 读 `index.json`，按 `updated_at` 降序                           |
| `delete_thread`   | 删除 `<id>/` 目录，从 `index.json` 移除                         |

## TUI 集成

`App` 新增字段：

```rust
pub thread_store: Arc<dyn ThreadStore>,
pub current_thread_id: Option<ThreadId>,
pub thread_browser: Option<ThreadBrowser>,  // TUI 内历史浏览面板
```

**启动流程**：

1. TUI 启动时，弹出 `ThreadBrowser` 面板，显示历史 thread 列表（按时间降序）
2. 用户选择「新建对话」→ `create_thread()`，进入空白对话
3. 用户选择历史 thread → `load_messages()`，恢复消息到 `App.messages`，继续对话

**持久化时机**：

- 用户发送消息时：`append_messages([Human 消息])`
- `poll_agent()` 收到完整 AI/Tool 消息后：`append_messages([新消息])`
- 每次写入后：`update_meta()` 更新 `updated_at` 和 `message_count`

## 依赖

- `uuid` crate（UUID v4 生成）
- `chrono` crate（时间戳）
- `async-trait` crate（已有）
- `serde_json`（已有）
- `tokio::fs`（异步文件 IO）

## 不在范围内

- SQLite 或其他存储后端（未来可实现 `SqliteThreadStore`）
- Thread 搜索/全文检索
- Thread 导出/导入

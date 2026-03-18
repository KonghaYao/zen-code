# rust-agent-tui Provider/Model 配置面板设计

**日期**: 2026-03-18 **状态**: 已确认，待实现

---

## 背景

`rust-agent-tui` 目前通过环境变量（`.env` 文件）配置 provider 和 model，没有持久化配置文件，也没有运行时切换的 UI 面板。

目标：

- 读写 `~/.zen-code/settings.json`（与 zen-code TUI 共享配置）
- 提供 `/model` 命令唤起交互面板，支持查看、切换、编辑 provider 和 model

---

## 配置存储

**文件路径**：`~/.zen-code/settings.json`（现有文件，不新建）

**读写策略**：

- 只映射用到的字段（`provider_id`、`model_id`、`providers[]`），其余字段用 `serde_json::Value` 保留
- 写回时使用 atomic write（先写临时文件，再 rename），避免写入中断导致文件损坏

### Rust 数据结构

```rust
// src/config/types.rs

#[derive(Serialize, Deserialize, Clone)]
pub struct ZenConfig {
    pub config: AppConfig,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct AppConfig {
    pub provider_id: String,
    pub model_id: String,
    pub providers: Vec<ProviderConfig>,
    #[serde(flatten)]
    pub extra: serde_json::Map<String, Value>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ProviderConfig {
    pub id: String,
    #[serde(rename = "type")]
    pub provider_type: String,   // "openai" | "anthropic"
    pub api_key: String,
    pub base_url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(flatten)]
    pub extra: serde_json::Map<String, Value>,
}
```

### 配置操作接口

```rust
// src/config/store.rs
pub fn config_path() -> PathBuf  // ~/.zen-code/settings.json
pub fn load() -> Result<ZenConfig>   // 文件不存在时返回空默认值
pub fn save(cfg: &ZenConfig) -> Result<()>  // atomic write
```

---

## `/model` 面板 UI

### 布局

```
┌─ /model ────────────────────────────────────────────┐
│ Providers                          [ n 新增 | d 删除 ] │
│  > ● Anthropic (anthropic)  claude-sonnet-4-6        │
│    ○ OpenAI (openai)        gpt-4o                   │
│    ○ ZhiPu (openai)         glm-4.7                  │
│                                                       │
│ Model ID  [ claude-sonnet-4-6_______________ ]       │
│ API Key   [ sk-ant-*********************** ]         │
│ Base URL  [ https://api.anthropic.com       ]        │
│                                                       │
│ Enter 确认  Esc 取消  e 编辑  n 新增  d 删除           │
└───────────────────────────────────────────────────────┘
```

- `●` = 当前激活的 provider；`○` = 其他 provider
- 底部字段在「编辑模式」时可交互，平时显示选中 provider 的信息（只读）

### 键位映射

| 按键                | 动作                                                                    |
| ------------------- | ----------------------------------------------------------------------- |
| `↑ / ↓`             | 在 provider 列表移动光标                                                |
| `Enter`（列表焦点） | 确认选中当前 provider，更新 `provider_id` 和 `model_id`，保存并关闭面板 |
| `e`                 | 进入编辑模式，可修改选中 provider 的 Model ID / API Key / Base URL      |
| `n`                 | 新建 provider（清空表单，进入编辑模式）                                 |
| `d`                 | 删除选中 provider（需输入 `y` 二次确认）                                |
| `Tab`（编辑模式）   | 在 Model ID → API Key → Base URL 字段间循环                             |
| `Enter`（编辑模式） | 保存当前编辑，写回配置文件                                              |
| `Esc`               | 取消并关闭面板（不保存）                                                |

---

## 集成点

### 启动时加载配置

`App::new()` 改为：

1. 调用 `config::load()` 读取 `~/.zen-code/settings.json`
2. 按 `provider_id` 找到对应 `ProviderConfig`，构造 `LlmProvider`
3. 若失败或文件不存在，fallback 到现有 `LlmProvider::from_env()` 逻辑

`App` struct 新增字段：

```rust
pub zen_config: Option<ZenConfig>,  // 内存中的配置快照
```

### 命令解析（`event.rs`）

用户输入 `/model` 回车 → `App::open_model_panel()` → 设置 `app.model_panel: Option<ModelPanel>`

`ui.rs` 检测到 `model_panel.is_some()` 时，覆盖渲染面板（与现有 HITL 弹窗模式相同）

### 实时生效

面板保存后，立即更新 `App` 内的 `LlmProvider`，下一条消息直接使用新 provider，无需重启。

---

## 新增文件

| 文件                                    | 职责                                       |
| --------------------------------------- | ------------------------------------------ |
| `rust-agent-tui/src/config/mod.rs`      | 模块入口                                   |
| `rust-agent-tui/src/config/types.rs`    | `ZenConfig`, `AppConfig`, `ProviderConfig` |
| `rust-agent-tui/src/config/store.rs`    | `load()`, `save()`                         |
| `rust-agent-tui/src/app/model_panel.rs` | `ModelPanel` 状态与交互逻辑                |
| `rust-agent-tui/src/ui/model_panel.rs`  | 面板渲染（ratatui）                        |

### 修改文件

| 文件                                 | 改动                                                               |
| ------------------------------------ | ------------------------------------------------------------------ |
| `rust-agent-tui/src/app/mod.rs`      | `App` 新增 `zen_config`, `model_panel` 字段；`poll_agent` 无需改动 |
| `rust-agent-tui/src/app/provider.rs` | 新增 `LlmProvider::from_config()` 构造方法                         |
| `rust-agent-tui/src/event.rs`        | 识别 `/model` 命令；转发面板内键盘事件                             |
| `rust-agent-tui/src/ui.rs`           | 检测 `model_panel` 并覆盖渲染                                      |

---

## 依赖

`rust-agent-tui/Cargo.toml` 新增：

```toml
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

（若已存在则无需重复添加）

# rust-agent-tui Command System 设计

**日期**: 2026-03-18 **状态**: 已确认，待实现

---

## 背景

当前 `/model` 命令在 `event.rs` 里硬编码 `if text == "/model"`，无法扩展。目标是实现通用命令系统，支持任意以 `/`
开头的命令，新增命令无需修改 `event.rs`。

---

## 架构：集中注册表（方案 A）

### 核心模块：`src/command/`

#### `Command` trait

```rust
pub trait Command: Send + Sync {
    fn name(&self) -> &str;           // 不含 /，如 "model"
    fn description(&self) -> &str;    // 单行描述，用于 /help
    fn execute(&self, app: &mut App, args: &str);
}
```

#### `CommandRegistry`

```rust
pub struct CommandRegistry {
    commands: Vec<Box<dyn Command>>,
}

impl CommandRegistry {
    pub fn new() -> Self;
    pub fn register(&mut self, cmd: Box<dyn Command>);
    /// 解析 "/model foo" → name="model", args="foo"，查表执行
    /// 返回 true=命令已执行，false=未知命令
    pub fn dispatch(&self, app: &mut App, input: &str) -> bool;
    /// 返回所有命令列表（供 /help 使用）
    pub fn list(&self) -> Vec<(&str, &str)>;
}
```

**解析规则**：输入 `"/model foo bar"` → `name = "model"`，`args = "foo bar"`（trim 首尾空格）。

---

## 内置命令：`src/command/builtins.rs`

| 命令     | struct         | 行为                     |
| -------- | -------------- | ------------------------ |
| `/model` | `ModelCommand` | 打开 provider 配置面板   |
| `/clear` | `ClearCommand` | 清空 `app.messages`      |
| `/help`  | `HelpCommand`  | 打印所有命令列表到消息区 |

---

## event.rs 集成

### App 新增字段

```rust
pub command_registry: CommandRegistry,
```

### App::new() 注册内置命令

```rust
let mut registry = CommandRegistry::new();
registry.register(Box::new(ModelCommand));
registry.register(Box::new(ClearCommand));
registry.register(Box::new(HelpCommand));
app.command_registry = registry;
```

### Ctrl+S 提交逻辑

```rust
if text.starts_with('/') {
    app.textarea = build_textarea(false);
    // dispatch 借用问题：将 registry take 出来再调用
    let registry = std::mem::take(&mut app.command_registry);
    let known = registry.dispatch(app, &text);
    app.command_registry = registry;
    if !known {
        app.messages.push(ChatMessage::system(
            format!("未知命令: {}，输入 /help 查看可用命令", text)
        ));
    }
} else if !text.is_empty() {
    app.textarea = build_textarea(false);
    return Ok(Some(Action::Submit(text)));
}
```

> `std::mem::take` 临时取出 registry，执行完毕放回，避免同时借用 `app` 两次。 `CommandRegistry` 需要实现 `Default`。

---

## 新增文件

| 文件                      | 职责                                          |
| ------------------------- | --------------------------------------------- |
| `src/command/mod.rs`      | `Command` trait + `CommandRegistry`           |
| `src/command/builtins.rs` | `ModelCommand`、`ClearCommand`、`HelpCommand` |

## 修改文件

| 文件             | 改动                                                     |
| ---------------- | -------------------------------------------------------- |
| `src/app/mod.rs` | `App` 新增 `command_registry` 字段，`new()` 注册内置命令 |
| `src/event.rs`   | Ctrl+S 统一走 command dispatch，删除硬编码 `/model` 判断 |
| `src/main.rs`    | 注册 `command` 模块                                      |

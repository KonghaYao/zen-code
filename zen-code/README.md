# Zen Code

## 🚀 快速开始

### 安装

```bash
bun install -g zen-code
```

### 启动

```bash
zen-code
```

首次启动会自动弹出初始化向导，引导完成基本配置。

## 📖 使用方式

### 1. 交互式模式（默认）

直接启动进入 TUI 界面：

```bash
zen-code
bunx --bun zen-code
```

### 2. 提示模式

直接执行单个任务：

```bash
zen-code -p "分析当前代码库结构"
```

### 3. 管道模式

从 stdin 读取数据：

```bash
cat large-file.ts | zen-code
```

### 4. 快速模式（YOLO）

禁用人机确认，自动执行所有操作：

```bash
zen-code --yolo
```

## 💬 常用命令

在 TUI 界面中输入以下命令：

| 命令         | 描述           |
| ------------ | -------------- |
| `/help`      | 显示帮助       |
| `/m`         | 模型管理       |
| `/agent`     | 切换 AI 助手   |
| `/history`   | 聊天历史       |
| `/knowledge` | 知识库管理     |
| `/mcp`       | MCP 服务器管理 |
| `/status`    | 查看系统状态   |
| `/config`    | 配置管理       |
| `/sum`       | 压缩记忆       |

### 模型切换

```bash
/m                    # 列出所有模型
/m 2                  # 切换到第 2 个模型
/m gpt-4o            # 切换到特定模型
/mp                   # 打开交互式模型选择面板
```

## 📄 License

Apache-2.0

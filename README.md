# Zen Code

> 你的终端 AI 编程助手

## 🎯 项目定位

Zen Code 是一个基于 LangGraph 的 AI 编程助手，提供完整的 TUI（终端用户界面）交互体验。支持 Claude Code 和 Gemini
CLI 的核心交互模式，帮助开发者通过自然语言完成编码任务。

### 核心价值

- **终端原生**：在命令行中直接对话，无需离开开发环境
- **智能交互**：Magic Input 缓冲区，类 Cursor 的流畅体验
- **本地优先**：基于 SQLite 的持久化存储，记忆和配置完全本地控制
- **可扩展能力**：Skills 和 SubAgent 系统，按需增强助手能力

## ✨ 核心特性

### AI 能力

| 特性                  | 说明                                  |
| --------------------- | ------------------------------------- |
| **双模型支持**        | OpenAI / Anthropic 无缝切换           |
| **Thinking 模式**     | Claude Thinking 支持，可配置开关      |
| **Human in the Loop** | 敏感操作自动确认，安全可控            |
| **MCP 协议**          | Model Context Protocol 工具集成       |
| **SubAgent 系统**     | 任务委托专用子 Agent（finder 搜索等） |
| **Skills 系统**       | 项目级/用户级技能，渐进式加载         |
| **记忆系统**          | 向量存储 + 语义搜索                   |

### TUI 界面

- **交互式聊天**：自然语言对话，流畅的响应体验
- **命令系统**：`/init`、`/model`、`/help`、`/mp` 等
- **面板切换**：Chat / History / Knowledge / Model Panel
- **键盘导航**：↑↓ 选择、Enter 确认、q 关闭
- **Markdown 渲染**：语法高亮、代码块着色

## 🚀 快速开始

### 安装

```bash
pnpx zen-code
```

### 初始化

```bash
zen-code init
```

运行后按提示配置：

- 选择模型提供商（OpenAI / Anthropic）
- 输入 API Key
- 配置完成即可开始使用

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

Apache-2.0

## 🔗 参考

- [Claude Code](https://docs.anthropic.com/)
- [Cursor](https://cursor.com/)
- [DeepAgents](https://github.com/langchain-ai/deepagents)

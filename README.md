# Code Graph

一个视图无关的 LangGraph Coding Agent, Like Claude Code or Gemini Cli.

## 我想做的

-   [x] 完整的 TS LangGraph Agent Stack
    -   [x] Agent Runtime (Open LangGraph Server)
    -   [x] Agent Frontend SDK (@langgraph-js/sdk)
-   [x] Human In the Loop
    -   [ ] Yolo Mode（用于自动控制授权）
    -   [ ] Automatically Security
-   [x] 现在改为手动进行 /sum
-   [x] Anthropic and OpenAI Model Support
-   [x] Magic Input
    -   [x] 缓冲区（like cursor）
-   [x] 支持 template
-   [x] 支持 thinking
-   [ ] 文件变更检测机制
-   [x] SubAgent
-   [x] Agent Skills
-   [x] MCP
-   [x] AGENTS.md/CLAUDE.md
-   [ ] Sandbox
-   [ ] Memory System

## 项目结构

```
code-graph/
├── agents/                      # Agent 核心代码
│   └── code/                   # 主要 Agent 实现
│       ├── ask_agents.ts       # SubAgent 通信模块
│       ├── export.ts           # 导出配置
│       ├── graph.ts            # LangGraph 定义
│       ├── middlewares/        # 中间件
│       ├── prompts/            # 提示词模板
│       ├── server.ts           # LangGraph 服务器
│       ├── skills/             # Agent 技能模块
│       ├── state.ts            # 状态管理
│       ├── subagents/          # SubAgent 定义
│       ├── tools/              # 工具函数
│       └── utils/              # 工具类
│
├── tui/                        # TUI 前端界面
│   ├── src/                    # 源代码
│   │   ├── app.tsx            # 应用入口
│   │   ├── chat/              # 聊天界面组件
│   │   ├── hooks/             # React Hooks
│   │   ├── utils/             # 工具函数
│   │   └── index.ts           # 入口文件
│   └── dist/                   # 构建产物
│
├── .langgraph_api/            # LangGraph 运行时
│   ├── langgraph.db           # SQLite 数据库
│   └── memory.md              # 记忆系统
│
├── .deepagents/               # DeepAgents 配置
│   └── skills/                # 项目技能
│       └── frontend-design/   # 前端设计技能
│
├── .env                       # 环境变量
├── .env.example               # 环境变量示例
├── package.json               # 项目依赖
├── pnpm-workspace.yaml        # PNPM 工作区配置
├── tsconfig.json              # TypeScript 配置
├── .prettierrc                # 代码格式化配置
├── init.sh                    # 初始化脚本
└── README.md                  # 项目文档
```

### 核心组件说明

-   **Agent Runtime**: 基于 LangGraph 的 Agent 运行时，支持 Human-in-the-loop
-   **TUI Frontend**: 基于 React 的终端用户界面
-   **SubAgent System**: 支持任务委托的子 Agent 系统
-   **Skills System**: 可扩展的技能系统，支持项目特定技能
-   **Memory System**: 基于 SQLite 的状态和记忆管理

### 运行与开发

-   使用 `pnpm dev` 启动开发环境
-   使用 `pnpm build` 构建项目

```sh
# openai model base settings
OPENAI_API_KEY=
OPENAI_BASE_URL=

# Demo of Using PG
# DATABASE_URL=postgresql://postgres:postgres@localhost:5434/langgraph_test_10?sslmode=require
# DATABASE_NAME=langgraph_test_10

SQLITE_DATABASE_URL=./.langgraph_api/langgraph.db
```

## 贡献及反馈

欢迎在 https://github.com/KonghaYao/coding-graph/issues 反馈问题与建议。

## 参考

本项目参考了

-   [ShareAI-lab](https://github.com/shareAI-lab)
-   [Claude Code](https://docs.anthropic.com/)
-   [Cursor](https://cursor.com/)
-   [DeepAgents](https://github.com/langchain-ai/deepagents)

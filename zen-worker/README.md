# Zen Worker

> Code Graph Web UI - 基于 React + Vite 的现代化 Web 界面

## 功能特性

- 🎨 **现代化 UI** - 基于 React 18 和 Tailwind CSS
- 💬 **聊天界面** - 与 AI 助手实时对话
- ⚙️ **配置管理** - 可视化配置系统设置
- 🎯 **Skills 管理** - 管理和编辑 AI Skills
- 🧩 **插件系统** - 扩展功能（开发中）
- 📜 **历史记录** - 查看对话历史（开发中）
- 🌙 **主题切换** - 支持亮色和暗色主题

## 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite 5
- **路由**: React Router v6
- **样式**: Tailwind CSS
- **状态管理**: React Hooks
- **依赖包**:
  - `@codegraph/config` - 配置管理
  - `@codegraph/agent` - Agent 核心
  - `@codegraph/union-client` - 客户端共享逻辑
  - `@langgraph-js/sdk` - LangGraph SDK

## 开发

### 前置要求

- Node.js >= 18
- pnpm 或 bun
- Agent Server 运行在 `http://localhost:8123`

### 安装依赖

\`\`\`bash
# 从项目根目录
pnpm install
# 或
bun install
\`\`\`

### 启动开发服务器

\`\`\`bash
# 启动 Agent Server（终端 1）
bun run dev:server

# 启动 Web UI（终端 2）
cd zen-worker
bun run dev
\`\`\`

访问 `http://localhost:5173`

### 环境变量

创建 `.env` 文件：

\`\`\`env
# Agent Server URL
VITE_API_URL=http://localhost:8123

# WebSocket URL
VITE_WS_URL=ws://localhost:8123
\`\`\`

## 构建

\`\`\`bash
bun run build
\`\`\`

构建产物将输出到 `dist/` 目录。

## 预览构建

\`\`\`bash
bun run preview
\`\`\`

## 项目结构

\`\`\`
zen-worker/
├── src/
│   ├── components/          # React 组件
│   │   ├── Chat/           # 聊天相关组件
│   │   ├── Config/         # 配置相关组件
│   │   ├── Layout/         # 布局组件
│   │   └── common/         # 通用组件
│   ├── pages/              # 页面组件
│   │   ├── ChatPage.tsx
│   │   ├── ConfigPage.tsx
│   │   ├── SkillsPage.tsx
│   │   ├── PluginsPage.tsx
│   │   └── HistoryPage.tsx
│   ├── hooks/              # 自定义 Hooks
│   │   ├── useAgent.ts
│   │   ├── useConfig.ts
│   │   ├── useSkills.ts
│   │   ├── useWebSocket.ts
│   │   └── useTheme.ts
│   ├── contexts/           # React Context
│   │   └── ThemeContext.tsx
│   ├── lib/                # 工具库
│   │   ├── api.ts
│   │   └── websocket.ts
│   ├── styles/             # 样式文件
│   ├── App.tsx             # 应用根组件
│   └── main.tsx            # 入口文件
├── public/                 # 静态资源
├── index.html              # HTML 模板
├── vite.config.ts          # Vite 配置
├── tailwind.config.js      # Tailwind 配置
└── package.json
\`\`\`

## 使用说明

### 聊天

1. 访问首页或点击"聊天"
2. 在输入框中输入消息
3. 按 Enter 发送，Shift+Enter 换行

### 配置

1. 点击侧边栏"配置"
2. 修改模型设置、API 密钥等
3. 更改会自动保存

### Skills 管理

1. 点击侧边栏"Skills"
2. 查看所有可用的 Skills
3. 点击"查看"查看 Skill 详情

### 主题切换

点击侧边栏底部的主题按钮可在亮色和暗色模式之间切换。

## 开发指南

### 添加新页面

1. 在 `src/pages/` 创建新组件
2. 在 `src/App.tsx` 添加路由
3. 在 `src/components/Layout/Sidebar.tsx` 添加导航项

### 添加新组件

遵循现有组件的风格：

- 使用 TypeScript 类型
- 使用 Tailwind CSS 样式
- 导出 Props 接口

### 使用 Hook

\`\`\`typescript
import { useAgent } from '../hooks/useAgent';

function MyComponent() {
  const { messages, sendMessage, isLoading } = useAgent();
  // ...
}
\`\`\`

## 故障排除

### 无法连接到 Agent Server

确保 Agent Server 正在运行：

\`\`\`bash
# 从项目根目录
bun run dev:server
\`\`\`

### WebSocket 连接失败

检查环境变量 `VITE_WS_URL` 是否正确。

### 样式问题

清除缓存并重新构建：

\`\`\`bash
rm -rf node_modules dist
bun install
bun run dev
\`\`\`

## License

MIT

## Contributing

欢迎贡献！请提交 Issue 或 Pull Request。

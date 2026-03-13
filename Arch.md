# 项目宏观架构

> 维护者备忘。强调各层关键类/函数之间的关联与调用关系。

---

## 整体分层与关键关联

```
╔══════════════════════════════════════════════════════════════════╗
║  CLIENT LAYER                                                    ║
║                                                                  ║
║  zen-code/cli.ts                    zen-swarm/server.ts          ║
║    └─ render(<Chat />)                └─ Bun.serve + Hono        ║
║         └─ TanStack Query hooks            └─ createTRPCHonoRoute║
║              (useConfig/useModels…)             └─ authMiddleware ║
║                                                                  ║
║  ┌── createCodeGraph() ──────────────── createSwarmGraph() ──┐  ║
║  │   graphBuilder.ts                    graphBuilder.ts       │  ║
║  │   switch_command → agentId           agent_id → agentId    │  ║
║  └──────────────┬───────────────────────────┬────────────────┘  ║
╠═════════════════╪═══════════════════════════╪════════════════════╣
║  APPLICATION LAYER                          │                    ║
║                 │                           │                    ║
║         createUnifiedAgent(agentId, state, options)             ║
║         unified-factory.ts                                       ║
║           │                                                      ║
║           ├─[1]─ agentPackage.getAgent(id)  ←── UnifiedCache    ║
║           │         (agentPackage 单例，config/index.ts)         ║
║           │                                                      ║
║           ├─[2]─ pkg.getModel(modelId)                           ║
║           │       └─ zen-code: process.env (无 providerResolver) ║
║           │       └─ zen-swarm: DbProviderResolver               ║
║           │                └─ providerStorage.getDecryptedApiKey ║
║           │                                                      ║
║           ├─[3]─ initChatModel(modelName, config)                ║
║           │                                                      ║
║           ├─[4]─ pkg.getPromptWithContent(promptId)              ║
║           │                                                      ║
║           ├─[5]─ agentConfig.middlewares → MiddlewareRegistry    ║
║           │         .getImplementation(id).execute(params)       ║
║           │                                                      ║
║           ├─[6]─ humanInTheLoopMiddleware({ interruptOn })       ║
║           └─[7]─ createAgent({ model, systemPrompt, middleware })║
║                                                                  ║
║  agentPackage 初始化链：                                         ║
║  loadDefaultConfigs()                                            ║
║    └─ new AgentPackage(new MemoryStorage())                      ║
║         └─ createMiddlewareRegistry(pkg)  ← 注册所有中间件实现   ║
║              └─ ClaudeAgentLoader.loadAllAgents()  ← Agent.md   ║
║                                                                  ║
║  ConfigManager (packages/config)                                 ║
║    ├─ FileSystemConfigStore → ~/.zen-code/settings.json          ║
║    ├─ FileSystemSkillStore  → .claude/skills/                    ║
║    └─ PermissionStore       → Bash/读/写权限规则                 ║
║         ↑ MCPWithConfigMiddleware 从此读取 mcp_config            ║
╠══════════════════════════════════════════════════════════════════╣
║  FRAMEWORK LAYER                                                 ║
║                                                                  ║
║  AgentPackage (standard-agent/package.ts)                        ║
║    ├─ AgentRepository   → getAgent / listAgents / addModel…      ║
║    ├─ AgentValidator    → validateAgent(id)                      ║
║    ├─ AgentSerializer   → toJSON / fromJSON                      ║
║    └─ MiddlewareRegistry                                         ║
║         ├─ registerImplementation(impl)  ← 注册时机              ║
║         └─ getImplementation(id)         ← 执行时查找            ║
║                                                                  ║
║  IStorage (storage/abstract.ts)                                  ║
║    ├─ MemoryStorage  (开发/当前生产)                              ║
║    └─ SQLiteStorage  (平台相关，可替换)                           ║
║         ↑ AgentPackage 通过构造函数注入                          ║
║                                                                  ║
║  中间件实现（均实现 AgentMiddleware 接口）                        ║
║    FilesystemMiddleware  → read/write/edit/glob/grep/folder      ║
║    TerminalMiddleware    → bash/cmd + background_processes       ║
║    SubAgentsMiddleware   → createAgent(taskId,args,state) 回调   ║
║    MCPMiddleware         → MCPManager 单例，懒连接+工具缓存       ║
║    SkillsMiddleware      → .claude/skills/ 渐进披露              ║
║    MemoriesMiddleware    → .claude/memories/ 渐进披露            ║
║    AgentsMdMiddleware    → AGENTS.md 注入                        ║
║    humanInTheLoopMiddleware → interruptOn 工具拦截               ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 中间件注册与发现链

```
createMiddlewareRegistry(pkg)          ← 应用层，启动时一次性执行
  │  subagents/middlewares.ts
  │
  ├─ pkg.addMiddleware({ id, execute })
  │    └─ AgentRepository.insertMiddleware()   → IStorage
  │
  └─ pkg.middlewares.registerImplementation({ id, execute })
       └─ MiddlewareRegistry._implementations.set(id, impl)
                                               ↓
                              createUnifiedAgent 构建中间件链时
                              MiddlewareRegistry.getImplementation(id)
                                .execute(customParams)
                                → AgentMiddleware 实例（含工具列表）
```

---

## SubAgents 委派链（跨层依赖注入）

```
Framework层:  SubAgentsMiddleware({ agents, createAgent })
                                          ↑ 回调由应用层注入
Application层: createSubAgentsMiddleware(pkg)          middlewares/subTasks.ts
                 └─ createAgent = createStandardAgentV2(agentId, pkg, state)
                                    └─ createUnifiedAgent(...)   ← 递归创建子 Agent
                                         └─ isSubAgent=true 时跳过 subagents 中间件
```

---

## MCP 集成链

```
MCPWithConfigMiddleware          packages/agent/middlewares/mcpWithConfig.ts
  └─ 读 ConfigManager.getConfig().mcp_config
       └─ MCPMiddleware          standard-agent/middlewares/mcp.ts
            └─ MCPManager 单例
                 ├─ 懒连接 SSE/stdio MCP server
                 ├─ 缓存工具列表
                 └─ 转发 tool call → MCP server response
```

---

## 配置存储结构

```
ConfigManager.initialize()
  ├─ FileSystemConfigStore   ~/.zen-code/settings.json    (provider/model/apiKey)
  ├─ FileSystemSkillStore    .claude/skills/**            (YAML+Markdown)
  ├─ FileSystemPluginStore   插件元数据
  └─ PermissionStore         Bash/读/写规则（基于 IConfigStore）

zen-swarm 额外：
  ProviderStorage    → DB（多 Provider + 加密 API Key）
  CronStorage        → DB（定时任务定义）
  StateMachineManager→ DB（工作区状态）
  DbProviderResolver → providerStorage.getDecryptedApiKey()
                              ↑ 注入到 createUnifiedAgent options
```

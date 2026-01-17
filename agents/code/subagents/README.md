# SubAgents

专业化子代理系统，通过 `switchBranch` 实现任务路由和委托。

## 架构

```
config.ts        # 配置定义（AgentConfig 接口）
factory.ts       # 标准工厂（createStandardAgent）
finder.ts        # Finder 子代理实现
```

## 子代理列表

### `default` - 全功能助手

**定位**: 通用代码助手

**工具**: 全部工具（`tools: ['all']`）

**特性**:
- 完整中间件链
- 启用 subagents 委托
- 启用 Anthropic prompt 缓存（MODEL_PROVIDER=anthropic 时）

**使用场景**: 默认路由，处理所有类型任务

---

### `finder` - 文件搜索专家

**定位**: 只读文件系统操作

**工具**:
- `glob_files` - 文件名模式搜索
- `search-files-rg` - 内容正则搜索
- `read_file` - 文件读取

**特性**:
- 无写入权限，安全可控
- 启用 agents_md、skills、memories
- 禁用 MCP、subagents、cache

**使用场景**:
- 大型代码库的导航和定位
- 符号和依赖关系的搜索分析
- 代码库结构探索

---

### `planner` - 任务规划专家

**定位**: 结构化任务分解和代码库分析

**工具**:
- `TodoWrite` - 任务列表管理
- `ask_user_with_options` - 用户交互
- `glob_files` - 文件名搜索
- `search-files-rg` - 内容搜索
- `read_file` - 代码读取

**特性**:
- 启用 agents_md、skills、memories
- 禁用 MCP、subagents、cache

**使用场景**:
- 复杂功能的任务拆分
- 迭代计划的生成和跟踪
- 用户需求澄清和优先级排序
- 代码库结构分析（已包含搜索工具）

---

### `reviewer` - 代码审查专家

**定位**: 只读代码分析

**工具**:
- `glob_files` - 文件定位
- `search-files-rg` - 模式搜索
- `read_file` - 代码读取

**特性**:
- 无修改能力，保证安全
- 启用 agents_md、skills、memories
- 禁用 MCP、subagents、cache

**审查维度**: 正确性、安全性、性能、可读性、规范、测试

**使用场景**:
- 代码质量和规范检查
- 安全漏洞和潜在 bug 识别
- 架构设计和依赖关系审查

---

### `debugger` - 调试专家

**定位**: 问题诊断和错误分析

**工具**:
- `glob_files` - 文件定位
- `search-files-rg` - 代码搜索
- `read_file` - 代码读取
- `bash` - 运行调试命令和测试

**特性**:
- 启用 agents_md、skills、memories
- 禁用 MCP、subagents、cache

**调试流程**: 理解问题 → 收集信息 → 定位根因 → 验证假设 → 提出修复

**常见问题**: 空指针、异步竞态、类型不匹配、边界条件、状态管理

**使用场景**:
- 错误堆栈分析
- 日志追踪和调试
- 复现步骤生成
- 修复方案验证

---

### `refactor` - 重构专家

**定位**: 代码结构优化和迁移

**工具**: 全部工具（`tools: ['all']`）

**特性**:
- 保持行为不变（重构不改变功能）
- 启用 agents_md、skills、memories
- 禁用 MCP、subagents、cache

**重构类型**: 提炼、结构、简化、架构

**设计原则**: SOLID、DRY、组合优于继承、依赖注入

**使用场景**:
- 代码异味消除
- 设计模式应用
- 技术债务清理
- 框架/库迁移

---

### `tester` - 测试专家

**定位**: 测试策略和用例生成

**工具**: 全部工具（`tools: ['all']`）

**特性**:
- 测试先行（TDD）
- 启用 agents_md、skills、memories
- 禁用 MCP、subagents、cache

**测试金字塔**: 单元测试 70%、集成测试 20%、端到端测试 10%

**测试方法**: 等价类划分、边界值分析、决策表、异常场景

**使用场景**:
- 测试策略设计
- 单元/集成测试生成
- 覆盖率分析
- Mock/Stub 设计

---

### `security` - 安全专家

**定位**: 代码安全审计和漏洞识别

**工具**:
- `glob_files` - 文件定位
- `search-files-rg` - 模式搜索
- `read_file` - 代码读取

**特性**:
- 零信任验证
- 启用 agents_md、skills、memories
- 禁用 MCP、subagents、cache

**检查清单**: 注入攻击、认证授权、数据安全、输入验证、依赖安全、配置安全

**参考标准**: OWASP Top 10

**使用场景**:
- 安全漏洞扫描
- 敏感数据审计
- 依赖安全检查
- 安全配置审查

---

### `performance` - 性能专家

**定位**: 瓶颈分析和性能优化

**工具**:
- `glob_files` - 文件定位
- `search-files-rg` - 模式搜索
- `read_file` - 代码读取

**特性**:
- 先测量后优化
- 启用 agents_md、skills、memories
- 禁用 MCP、subagents、cache

**优化维度**: 时间复杂度、空间复杂度、I/O 优化、缓存策略、并发处理、前端性能

**常见问题**: N+1 查询、频繁 DOM 操作、大文件处理、同步阻塞

**使用场景**:
- 性能瓶颈分析
- 算法优化建议
- 缓存策略设计
- 并发处理改进

---

### `organizer` - 知识整理专家

**定位**: 维护记忆系统和 AGENTS.md

**工具**: 全部工具（`tools: ['all']`）

**特性**:
- 评估知识价值，过滤噪音
- 结构化组织内容
- 启用 agents_md、skills、memories
- 禁用 MCP、subagents、cache

**记忆系统**: `.claude/memories/{architecture,bug-fix,workflow,configuration,optimization}/`

**工作流程**: 扫描上下文 → 识别知识 → 分类归档 → 验证价值 → 结构化输出

**记录原则**:
- ✅ 非直观配置、踩坑经验、跨文件依赖、性能优化、架构决策
- ❌ 显而易见的逻辑、标准库用法、一次性修改、过时信息

**使用场景**:
- 任务完成后沉淀知识
- 更新 AGENTS.md 项目约定
- 创建/更新记忆文件
- 清理过时的知识

## 配置系统

### AgentConfig 接口

```typescript
interface AgentConfig {
    id: string;              // 唯一标识符
    name: string;            // 显示名称
    description: string;     // 功能描述
    systemPrompt: string | ((state: any) => Promise<string>);
    tools: string[];         // 工具名称数组或 ['all']
    middleware: {
        agents_md?: boolean;
        skills?: boolean;
        memories?: boolean;
        mcp?: boolean;
        subagents?: boolean;
        cache?: boolean;
    };
}
```

### 中间件开关对比

| 中间件 | finder | planner | reviewer | debugger | refactor | tester | security | performance | organizer | default |
|--------|--------|---------|----------|----------|----------|--------|----------|-------------|-----------|---------|
| agents_md | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| skills | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| memories | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| mcp | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| subagents | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| cache | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | 条件 |

### 工具分类

**只读工具**（安全专家）:
- `glob_files`, `search-files-rg`, `read_file`

**读写工具**（执行专家）:
- `write_tool`, `replace_tool`, `bash`

**交互工具**:
- `ask_user_with_options`, `TodoWrite`

### 工具分配策略

| 子代理 | 工具范围 | 理由 |
|--------|---------|------|
| finder | 只读 | 搜索定位，无需修改 |
| planner | 只读 + 交互 | 规划分析，需要用户确认 |
| reviewer | 只读 | 审查分析，不应修改 |
| debugger | 只读 + bash | 调试需要运行命令验证 |
| security | 只读 | 安全审计，不应修改 |
| performance | 只读 | 性能分析，不应修改 |
| refactor | 全部 | 重构需要修改代码 |
| tester | 全部 | 测试需要生成测试文件 |
| organizer | 全部 | 需要更新 AGENTS.md 和创建记忆文件 |
| default | 全部 | 全功能助手 |

## 工厂模式

`createStandardAgent()` 根据配置动态构建代理：

1. 初始化模型（`initChatModel`）
2. 过滤工具（`tools` 配置）
3. 构建中间件链（`middleware` 配置）
4. 解析系统提示词（`systemPrompt` 配置）
5. 返回 `ReactAgent` 实例

## 扩展新子代理

1. 在 `prompts/subagents/` 中添加提示词文件（如 `expert.ts`）
2. 在 `prompts/subagents/index.ts` 中导出 `getExpertPrompt`
3. 在 `config.ts` 的 `loadAgentsList()` 中添加配置
4. 可选：在 `factory.ts` 中添加专用创建函数
5. 可选：在 `SubAgentsMiddleware` 中注册（如果需要被委托）

## 与中间件插件系统的区别

| 特性 | SubAgents | 中间件插件 |
|------|-----------|-----------|
| 用途 | 任务路由和专业化 | 功能增强 |
| 位置 | `switchBranch` 节点 | Middleware 链 |
| 配置 | `config.ts` | 环境变量/代码 |
| 示例 | finder/reviewer | Skills/MCP/Memory |

两者可协同工作：`default` agent 通过 SubAgentsMiddleware 委托给 `finder`。

## 子代理选择指南

**快速查询** → `finder`
**任务规划** → `planner`
**代码审查** → `reviewer`
**调试问题** → `debugger`
**重构优化** → `refactor`
**生成测试** → `tester`
**安全审计** → `security`
**性能优化** → `performance`
**知识沉淀** → `organizer`
**不确定** → `default`

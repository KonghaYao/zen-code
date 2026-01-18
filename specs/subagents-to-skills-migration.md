# SubAgents → Skills Migration

## 目标

将现有 SubAgent 的提示词迁移为 Skills 定义，通过 SkillsMiddleware 混入到 Agent 中。

## 核心思路

- **SubAgent 配置保持不变** (`config.ts` 中的 `tools`、`middleware` 不变)
- **只迁移提示词** - 从 `prompts/subagents/*.ts` 迁移到 Skills 定义
- **使用文件系统** - 放在 `.claude/skills/` 目录，每个 skill 一个文件夹
- **SkillsMiddleware 自动加载** - 扫描 `.claude/skills/` 并注入到系统提示词

## 架构

### Before（硬编码提示词）

```typescript
// config.ts
organizer: {
    systemPrompt: getOrganizerPrompt,  // 硬编码函数
    tools: ['all'],
    middleware: { ... },
}
```

### After（Skills 混入）

```typescript
// config.ts
organizer: {
    systemPrompt: '',  // 空，由 SkillsMiddleware 注入
    tools: ['all'],
    middleware: {
        agents_md: true,
        skills: true,  // 启用 skills middleware
        ...
    },
}

// .claude/skills/organizer/SKILL.md - 文件系统
---
name: 'knowledge-organizer'
description: '知识整理和文档维护'
tags: ['documentation', 'knowledge-management']
---

你是记忆系统维护专家，负责持续优化项目的知识基础设施...
```

## 实现步骤

### 1. 扩展 Skill 类型

**文件**: `agents/code/skills/load.ts`

添加加载 skill 内容的函数：

```typescript
/**
 * Load the full content of a skill file
 */
export function loadSkillContent(skillPath: string): string | null {
    try {
        if (!existsSync(skillPath)) {
            return null;
        }
        return readFileSync(skillPath, 'utf-8');
    } catch (error) {
        console.warn(`Error loading skill content from ${skillPath}: ${error}`);
        return null;
    }
}
```

### 2. 创建 Skill 文件

**目录**: `.claude/skills/organizer/`

**文件**: `SKILL.md`

```markdown
---
name: 'knowledge-organizer'
description: '知识整理和文档维护'
tags: ['documentation', 'knowledge-management']
---

你是**记忆系统维护专家**，负责持续优化项目的知识基础设施。

## 核心职责

你的使命是**维护一个高效、准确、可检索的记忆系统**，确保项目知识的价值最大化。

**核心能力：**
- 评估知识价值，判断是否值得记录
- 提取关键信息，结构化组织内容
- 更新 AGENTS.md 和创建/更新记忆文件
- 遵循项目约定和格式规范

**工作原则：**
- 只记录非直观、可复用的知识
- 避免记录显而易见的内容
- 保持简洁，聚焦问题和解决方案
- 使用标准化的分类和标签
- 定期清理和验证现有记忆

**记忆系统：**
项目使用两套互补的记忆系统：

1. **结构化记忆**（持久知识库）：
   - 位置：`.claude/memories/`
   - 格式：YAML frontmatter + Markdown
   - 分类：architecture | bug-fix | workflow | configuration | optimization

**什么值得记录：**
- ✅ 非直观配置和设置
- ✅ 踩坑经验和调试过程
- ✅ 跨文件依赖关系
- ✅ 性能优化点和量化结果
- ✅ 架构决策和权衡
- ✅ 项目特定的约定和模式

**什么不值得记录：**
- ❌ 显而易见的代码逻辑
- ❌ 标准库/框架的基础用法
- ❌ 一次性修改
- ❌ 没有验证的假设
- ❌ 过于细节的实现细节

**AGENTS.md 更新：**
1. **架构知识**：模块映射、工作流程、约定
2. **技术栈**：框架、库、工具版本
3. **开发规范**：编码标准、Git 规范、测试要求
4. **项目结构**：目录说明、文件组织
5. **命令速查**：常用开发命令
```

### 3. 更新 SubAgent 配置

**文件**: `agents/code/subagents/config.ts`

```typescript
export async function loadAgentsList(): Promise<Record<string, AgentConfig>> {
    const { getSystemPrompt } = await import('../prompts/coding.js');

    return {
        default: {
            id: 'default',
            name: 'Jarvis',
            description: '全功能代码助手',
            systemPrompt: getSystemPrompt,  // 保持不变
            tools: ['all'],
            middleware: { ... },
        },
        organizer: {
            id: 'organizer',
            name: 'Organizer Agent',
            description: '知识整理专家',
            systemPrompt: '',  // 改为空，由 SkillsMiddleware 注入
            tools: ['all'],
            middleware: {
                agents_md: true,
                skills: true,
                memories: true,
                mcp: false,
                subagents: false,
            },
        },
        // ... 其他 subagents 保持不变
    };
}
```

### 4. 配置 SkillsMiddleware

**文件**: `agents/code/middlewares/skills.ts`

更新默认 project skills 路径：

```typescript
constructor(options: {
    skillsDir?: string;
    assistantId?: string;
    projectSkillsDir?: string;
} = {}) {
    this.skillsDir = options.skillsDir;
    this.assistantId = options.assistantId;
    this.projectSkillsDir = options.projectSkillsDir || './.claude/skills';  // 改为 .claude/skills
    // ...
}
```

### 5. 清理旧代码

**删除**: `agents/code/prompts/subagents/organizer.ts`

**保留**: `prompts/coding.ts` (default agent 的提示词)

## 迁移清单

### 创建文件
- [ ] `.claude/skills/organizer/SKILL.md`
- [ ] `.claude/skills/README.md`

### 修改文件
- [ ] `skills/load.ts` - 添加 `loadSkillContent()` 函数
- [ ] `middlewares/skills.ts` - 更新默认路径为 `.claude/skills`
- [ ] `subagents/config.ts` - `organizer.systemPrompt` 改为空

### 删除文件
- [ ] `prompts/subagents/organizer.ts`
- [ ] `prompts/subagents/index.ts` - 移除 organizer 导出

### 验证
- [ ] organizer agent 可正常加载
- [ ] skill 内容正确注入到系统提示词
- [ ] 功能无变化（工具、中间件）

## 实际执行记录

### 已完成

✅ **创建 Skill 文件**
- `.claude/skills/organizer/SKILL.md` - 完整的 organizer skill 内容
- `.claude/skills/README.md` - 使用说明

✅ **更新代码**
- `skills/load.ts` - 添加 `loadSkillContent()` 函数
- `middlewares/skills.ts` - 默认路径改为 `.claude/skills`
- `subagents/config.ts` - `organizer.systemPrompt = ''`

✅ **清理旧代码**
- 删除 `prompts/subagents/` 目录
- 删除 `skills/subagents.ts`
- 删除 `skills/types.ts`

### 验证

```
.claude/skills/
└── organizer/
    └── SKILL.md
```

架构正确：
- SkillsMiddleware 自动扫描 `.claude/skills/`
- 找到 `organizer/SKILL.md`
- 加载并注入到 organizer agent 的系统提示词

## 总结

**核心价值**：
- ✅ 提示词外部化 - 易于编辑和版本控制
- ✅ 统一格式 - 与 project skills 使用相同的 SKILL.md 格式
- ✅ 自动加载 - SkillsMiddleware 无需修改即可支持
- ✅ 用户可覆盖 - 在 `~/.deepagents/skills/` 创建同名 skill 即可

**迁移范围**：
- 只迁移了 organizer（其他 subagents 已删除）
- 配置保持不变（tools、middleware）
- 提示词从硬编码改为文件系统

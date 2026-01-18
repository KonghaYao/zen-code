---
name: "subagents-to-skills-migration-architecture"
description: "将 SubAgent 硬编码提示词迁移到文件系统 Skills 架构；核心是创建 .claude/skills/ 目录存储 SKILL.md 文件，SkillsMiddleware 自动扫描并注入到对应 agent 的系统提示词；关键决策：从 TS 常量定义改为文件系统方案，统一使用 YAML frontmatter + Markdown 格式，通过目录名（如 organizer）匹配 agent ID；适用于需要外部化管理 agent 提示词、支持用户自定义覆盖的场景"
tags: ["subagents", "skills", "middleware", "architecture", "migration"]
category: "architecture"
created: "2025-01-18"
last_updated: "2025-01-18"
priority: "high"
context_scope: "project"
---

# ## 背景

## 背景

原 SubAgent 系统将提示词硬编码在 `prompts/subagents/*.ts` 文件中，通过 `getFinderPrompt()` 等函数返回字符串，配置在 `config.ts` 的 `systemPrompt` 字段。这种方式不利于编辑和版本控制，也无法支持用户自定义。

## 解决方案

### 架构变更

**Before**:
```typescript
// prompts/subagents/organizer.ts
export function getOrganizerPrompt(): string {
  return `你是记忆系统维护专家...`;
}

// subagents/config.ts
organizer: {
  systemPrompt: getOrganizerPrompt,  // 硬编码
  tools: ['all'],
  middleware: { skills: true, ... },
}
```

**After**:
```typescript
// .claude/skills/organizer/SKILL.md
---
name: 'knowledge-organizer'
description: '知识整理和文档维护'
tags: ['documentation', 'knowledge-management']
---

你是记忆系统维护专家，负责持续优化项目的知识基础设施...

// subagents/config.ts
organizer: {
  systemPrompt: '',  // 由 SkillsMiddleware 注入
  tools: ['all'],
  middleware: { skills: true, ... },
}
```

### 关键修改

**1. 添加 loadSkillContent 函数** (`agents/code/skills/load.ts`)

```typescript
export function loadSkillContent(skillPath: string): string | null {
  try {
    if (!existsSync(skillPath)) return null;
    return readFileSync(skillPath, 'utf-8');
  } catch (error) {
    console.warn(`Error loading skill: ${error}`);
    return null;
  }
}
```

**2. 更新 SkillsMiddleware 路径** (`agents/code/middlewares/skills.ts:117`)

```typescript
constructor(options: {...} = {}) {
  this.projectSkillsDir = options.projectSkillsDir || './.claude/skills';
}
```

**3. 简化 Agent 配置** (`agents/code/subagents/config.ts`)

移除所有 subagent 的 `systemPrompt` 导入，改为空字符串，添加注释说明由 SkillsMiddleware 注入。

**4. 目录结构**

```
.claude/skills/
└── organizer/
    └── SKILL.md          # YAML frontmatter + 提示词内容
```

### 工作流程

1. Agent 被调用（如 organizer）
2. SkillsMiddleware 扫描 `.claude/skills/`
3. 根据目录名匹配 agent ID
4. 加载 SKILL.md 内容
5. 注入到系统提示词开头

## 适用场景

- 需要外部化管理 agent 提示词
- 支持用户自定义覆盖（通过 `~/.deepagents/skills/`）
- 提示词需要频繁修改或版本控制

## 注意事项

- Skill 目录名必须与 agent ID 匹配
- YAML frontmatter 必须包含 `name` 和 `description`
- default agent 保留使用 `prompts/coding.ts` 的硬编码提示词

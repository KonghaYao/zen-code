---
name: "tui-knowledge-panel-reuse-agents-loaders"
description: "TUI KnowledgePanel 组件应该复用 agents 文件夹中已有的加载函数，而不是重新实现文件读取和 YAML 解析逻辑。从 agents/code/memories/load.ts 导入 listMemories 函数，从 agents/code/skills/load.ts 导入 listSkills 函数。这些函数已经实现了安全检查（路径遍历防护、文件大小限制）和验证逻辑（命名规范、分类验证）。使用时只需要传入用户和项目目录路径即可获得合并后的元数据列表，项目级会覆盖用户级的同名条目。适用于需要在 TUI 或其他前端组件中展示 Memory 和 Skill 列表的场景。"
tags: ["code-reuse", "tui", "knowledge-panel", "listMemories", "listSkills"]
category: "workflow"
created: "2025-01-13"
last_updated: "2025-01-13"
priority: "medium"
context_scope: "project"
---

# ## 背景

## 背景

TUI 的 KnowledgePanel 组件原本手动实现了 Memory 和 Skill 文件的加载逻辑，包括：
- 读取目录结构
- 解析 YAML frontmatter
- 验证元数据

而 agents 文件夹中已有成熟的加载函数实现了相同功能。

## 解决方案

直接复用 agents 文件夹中的加载函数：

```typescript
// 导入已有的函数
import { listMemories, type MemoryMetadata } from '../../../../agents/code/memories/load';
import { listSkills, type SkillMetadata } from '../../../../agents/code/skills/load';

// 简化的加载函数
const loadMemories = () => {
    const projectMemoriesDir = join(process.cwd(), '.claude/memories');
    const userMemoriesDir = join(process.env.HOME || '', '.deepagents/code/memories');
    
    const loadedMemories = listMemories(userMemoriesDir, projectMemoriesDir);
    loadedMemories.sort((a, b) => a.category.localeCompare(b.category));
    setMemories(loadedMemories);
};

const loadSkills = () => {
    const projectSkillsDir = join(process.cwd(), '.claude/skills');
    const userSkillsDir = join(process.env.HOME || '', '.deepagents/code/skills');
    
    const loadedSkills = listSkills(userSkillsDir, projectSkillsDir);
    setSkills(loadedSkills);
};
```

## 优势

1. **代码减少约 80 行**：从手动实现 ~50 行逻辑简化到 3 行函数调用
2. **自动获得安全检查**：
   - 路径遍历防护（_isSafePath）
   - 文件大小限制（10MB）
3. **统一的验证逻辑**：
   - Memory 命名规范验证（kebab-case）
   - 分类枚举验证（architecture, bug-fix, workflow, configuration, optimization）
4. **未来只需维护一套代码**：修改加载逻辑只需更新 agents 文件夹中的代码

## 相关文件

- 参见 `tui/src/chat/components/KnowledgePanel.tsx`：完整的实现示例
- 参见 `agents/code/memories/load.ts`：listMemories 函数实现
- 参见 `agents/code/skills/load.ts`：listSkills 函数实现
- 参见 `tui/src/utils/cleanPath.ts`：路径清理工具函数

## 注意事项

- TUI 使用 Bun 运行，可以直接导入 TypeScript 文件
- 导入路径需要使用相对路径，注意文件层级（如 `../../../../agents/...`）
- 项目级 Memory/Skill 会覆盖用户级的同名条目

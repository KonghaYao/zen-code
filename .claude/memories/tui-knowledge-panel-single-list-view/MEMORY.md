---
name: "tui-knowledge-panel-single-list-view"
description: "TUI Chat 界面中知识库查看面板的实现模式；用户明确要求单列表视图，不展示详细内容，只显示元数据和文件路径链接；使用 Tabs 组件实现记忆/技能切换，从 .claude/ 和 ~/.deepagents/code/ 目录加载文件，解析 YAML frontmatter 提取元数据；适用于需要快速浏览知识库文件列表的场景"
tags: ["tui", "ink", "knowledge-panel", "ui-design", "yaml-frontmatter"]
category: "workflow"
created: "2025-01-13"
last_updated: "2025-01-13"
priority: "medium"
context_scope: "project"
---

# ## 背景

## 背景

在 TUI Chat 界面中需要查看 Memory 和 Skill 文件。初始实现使用左右分栏布局（40% 列表 + 60% 详情），用户反馈要求简化设计。

## 用户偏好

用户明确要求 UI 设计改动：
- **只使用单列表视图**，不展示具体内容
- **只显示元数据**（名称、描述、标签、来源）
- **显示文件路径链接**，不显示完整内容

## 最终实现

### 文件位置
`tui/src/chat/components/KnowledgePanel.tsx`

### 关键实现

1. **加载逻辑**
   - 从项目级目录：`.claude/memories` 和 `.claude/skills`
   - 从用户级目录：`~/.deepagents/code/memories` 和 `~/.deepagents/code/skills`
   - 解析 YAML frontmatter 提取元数据

2. **显示格式**
```
📁 memory-name · workflow
  记忆描述文本
  📄 /path/to/MEMORY.md #tag1 #tag2

👤 skill-name
  技能描述文本
  📄 /path/to/SKILL.md
```

3. **交互方式**
   - `k` 快捷键打开面板（命令模式下）
   - `←` `→` 切换标签
   - `q` 或 `ESC` 关闭面板

4. **使用现有组件**
   - 使用 `Tabs` 组件实现标签切换
   - 来源标识：📁 (项目) / 👤 (用户)

## 适用场景

- 需要 TUI 中快速浏览知识库文件列表
- 用户只关注文件存在性和元数据，不需要查看详细内容
- 需要通过文件路径快速定位到源文件

## 注意

- 移除了选择状态和详细内容展示
- 列表按 category 排序（记忆）或无序（技能）
- 使用 `dimColor` 降低次要信息的视觉权重

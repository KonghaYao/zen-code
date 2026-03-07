---
name: 'codebase-init'
description: '为整个项目初始化 .codebase 知识库。首次设置 .codebase、从头重建或用户请求 /codebase-init 时使用。'
---

# Codebase Init Skill

初始化一个全面的 `.codebase` 知识库，为 AI 代理提供项目级别的理解能力。

## 使用场景

- 首次设置 `.codebase` 文件夹
- 从头重建整个知识库
- 用户明确请求 `/codebase-init`

## 参数

| 参数        | 默认值 | 说明                                                            |
| ----------- | ------ | --------------------------------------------------------------- |
| `--batch=N` | `3`    | 每批并行文档 SubAgent 数量，网络/资源受限时调小，性能充足时调大 |

示例：`/codebase-init --batch=5`

## 架构概述

`.codebase` 文件夹是一个**模块级知识库**，遵循以下原则：

1. **以文件为中心**：每个重要文件都有独立的章节
2. **仅标记重点**：不包含完整代码，只记录关键信息
3. **渐进式披露**：INDEX.md → 模块文档 → 文件详情

文档格式参考：

- INDEX.md 格式：[references/index-template.md](references/index-template.md)
- 模块文档格式（含写作原则）：[references/module-template.md](references/module-template.md)
- 完整示例：[references/example.md](references/example.md)

## 执行流程

### 步骤 1：初始扫描（主 Agent）

仅做轻量级扫描，获取顶层结构：

```bash
# 找出顶层模块入口
find . -maxdepth 3 -name "package.json" -not -path "*/node_modules/*" | head -20
find . -maxdepth 2 -name "tsconfig.json" -not -path "*/node_modules/*" | head -20
```

收集结果后，立即派发 **Scanner SubAgent**（步骤 2），主 Agent 不做深度探索。

### 步骤 2：派发 Scanner SubAgent

派发一个专用 SubAgent 负责深度探索项目结构，输出结构化模块清单。

#### Scanner SubAgent 任务模板

```
探索项目结构，生成模块划分清单。

任务：
1. 找出所有顶层模块（packages/* 各子包、zen-code、zen-swarm 等独立目录）
2. 对每个模块统计 .ts/.tsx 文件数量（排除 node_modules、dist）
3. 检查子目录结构，判断是否需要拆分
4. 读取根目录 package.json、README.md、CLAUDE.md（或 AGENTS.md）了解项目概览

拆分判断规则（必须遵守）：
- 文件数 ≥ 25 → 拆分为多个子文档
- 文件数 < 25 → 单个文档（**优先合并**，不要因为有子目录就拆分）
- 满足以下**全部条件**才允许对子目录单独拆分：
  1. 子目录有自己的 index.ts 入口
  2. 子目录本身文件数 ≥ 15
  3. 子目录职责与父模块完全独立（如 api/ 和 frontend/ 是截然不同的关注点）
- **禁止**：仅因存在 middlewares/、storage/ 等子目录就拆分——这些通常是父模块的实现细节，应合并到父模块文档

output_file 命名规则（必须遵守）：
- 格式：`.codebase/[顶层目录名]/[子模块名].md`
- **禁止**用连字符拼接路径（`zen-code-commands.md` 是错误的）
- **必须**用目录结构分隔（`zen-code/commands.md` 是正确的）
- 顶层目录名 = 模块所在的一级目录（`zen-code`、`zen-swarm`、`packages`）
- 子模块名 = 具体模块的功能名（`commands`、`chat`、`api`），不是完整路径拼接

正确示例：
  zen-code/src/chat/commands  →  .codebase/zen-code/commands.md
  zen-code/src/chat/hooks     →  .codebase/zen-code/hooks.md
  zen-swarm/src/api           →  .codebase/zen-swarm/api.md
  zen-swarm/src/frontend      →  .codebase/zen-swarm/frontend.md
  packages/standard-agent/src →  .codebase/packages/standard-agent.md  （含 storage/ 和 middlewares/ 子目录，合并为一个文档）

错误示例（禁止）：
  zen-code-commands.md                 ← 不允许，路径没有用目录分隔
  zen-code-chat-hooks.md               ← 不允许，层级过多且用连字符
  zen-swarm.md                         ← 不允许，根目录下的扁平文件（除非确实是单文件模块）
  packages/standard-agent-storage.md  ← 不允许，storage/ 是父模块的实现细节，不应独立拆分

输出格式（纯 JSON，不附加其他文字）：
{
  "project_summary": "2-4句话概括项目，必须覆盖所有客户端/入口",
  "architecture_layers": {
    "framework": ["packages/standard-agent", "packages/agent-middlewares"],
    "application": ["packages/agent", "packages/config"],
    "client": ["zen-code", "zen-swarm"]
  },
  "modules": [
    {
      "module_path": "packages/standard-agent/src",
      "output_file": ".codebase/packages/standard-agent.md",
      "layer": "framework",
      "description": "Agent 系统框架库，提供 AgentPackage、中间件基类"
    },
    {
      "module_path": "zen-swarm/src/api",
      "output_file": ".codebase/zen-swarm/api.md",
      "layer": "client",
      "description": "tRPC API 路由层（models/prompts/agents/middlewares）"
    }
  ]
}
```

### 步骤 3：创建 INDEX.md（主 Agent）

基于 Scanner SubAgent 返回的 JSON 数据，创建 INDEX.md。

**标题必须固定为 `# .codebase 索引`**，不要加项目名或副标题。

INDEX.md 必须包含以下四个部分（格式参考 [references/index-template.md](references/index-template.md)）：

1. **项目概览**：使用 Scanner 的 `project_summary`，**必须覆盖所有客户端/入口**
2. **架构分层**：使用 Scanner 的 `architecture_layers`，用图示标出每层对应哪些包
3. **模块索引表**：使用 Scanner 的 `modules` 列表，包含"层级"列
4. **场景检索表**：5-8 个高频任务场景 → 直接对应的文档位置

写入 `.codebase/INDEX.md`

### 步骤 4：分批派发文档 SubAgent（循环直到全部完成）

**批次大小**：默认每批 **3** 个 SubAgent 并行，用户可在命令中指定（如 `/codebase-init --batch=5`）。

**这是一个循环过程，必须持续到 modules 数组全部处理完毕**：

```
remaining = Scanner 返回的 modules 数组（全部）

循环：
  当 remaining 不为空时：
    batch = 取 remaining 前 batch_size 个，从 remaining 中移除
    并行派发 batch 中每个模块的文档 SubAgent
    等待本批全部 SubAgent 完成
    继续下一轮循环

直到 remaining 为空，循环结束
```

示例（11 个模块，batch_size=3）：

```
批次 1 (并行):  m0, m1, m2  → 等待完成 → 继续
批次 2 (并行):  m3, m4, m5  → 等待完成 → 继续
批次 3 (并行):  m6, m7, m8  → 等待完成 → 继续
批次 4 (并行):  m9, m10     → 等待完成 → remaining 为空，循环结束
```

**不要在 batch 1 完成后就停止**，必须继续处理所有剩余批次。

#### 文档 SubAgent 任务模板

```
分析 [module-path] 模块，生成 .codebase/[output-path].md 文档。

要求：
1. 遵循 references/module-template.md 中的模块文档模板和写作原则
2. 每个文件对应独立的 `## 文件：xxx` 章节，**禁止将多个文件合并到同一章节**
3. **文件章节标题格式必须严格使用 `## 文件：filename.ts`**，不得使用 `### filename.ts`、加粗、或其他格式
4. 只标记重点，不写全部代码
5. 标注依赖关系
6. 每个导出函数/类用简洁的 "用途: xxx + bullet points" 格式
7. 核心文件（入口、工厂、主类）补充代码示例；工具类文件可简略但不省略"关键导出"和"依赖关系"

模块路径: [module-path]
输出文件: .codebase/[output-path].md
```

### 步骤 5：汇总验证

1. 对比 Scanner 返回的 `modules` 数组与实际生成的 `.md` 文件
2. 找出所有 `output_file` 对应的文件不存在的模块
3. **如果有缺失模块**：将缺失模块作为新的 `remaining`，重新执行步骤 4 的循环
4. 直到所有模块都有对应 `.md` 文件后，报告摘要：创建了 X 个模块文档

### 步骤 6：更新 CLAUDE.md

知识库初始化完成后，**必须**将 `.codebase` 使用说明写入项目的 `CLAUDE.md`（如果 CLAUDE.md 不存在则创建）。

在 CLAUDE.md 中追加以下章节（如果已存在 `## Codebase Knowledge Base` 章节则替换它）：

```markdown
## Codebase Knowledge Base

项目已初始化 `.codebase` 知识库，包含所有模块的结构化文档。

**使用规则**：在搜索或探索源代码之前，**必须先查阅 `.codebase` 文件夹**：

1. 查看 `.codebase/INDEX.md` 了解项目整体结构和模块列表
2. 查阅对应模块的 `.codebase/[module].md` 获取文件结构、关键导出和依赖关系
3. 只有在 `.codebase` 中找不到足够信息时，才直接搜索源代码

**好处**：避免重复扫描大量源文件，提升响应速度和准确性。
```

## SubAgent 任务数据

**Scanner SubAgent**（步骤 2，只派发一次）：

```
探索项目结构，生成模块划分清单（见步骤 2 的 Scanner SubAgent 任务模板）
```

**文档 SubAgent**（步骤 4，并行派发多个）：

```json
{
    "module_path": "packages/standard-agent/src",
    "output_file": ".codebase/packages/standard-agent.md",
    "module_template": ".claude/skills/codebase-init/references/module-template.md"
}
```

## 输出结构

```
.codebase/
├── INDEX.md                    # 项目索引（必需）
└── [module-path]/              # 模块目录
    └── [module].md             # 模块文档
```

示例：

```
.codebase/
├── INDEX.md
├── packages/
│   ├── standard-agent.md
│   ├── agent-middlewares.md
│   ├── agent.md
│   └── config.md
└── zen-code/
    └── chat.md
```

## 质量检查清单

完成前验证：

- [ ] INDEX.md 存在，标题为 `# .codebase 索引`（不含项目名）
- [ ] INDEX.md 项目概览覆盖所有客户端/入口（无遗漏）
- [ ] INDEX.md 包含架构分层图（如果项目有分层）
- [ ] INDEX.md 模块索引表包含"层级"列
- [ ] INDEX.md 包含场景检索表（≥5 个高频场景）
- [ ] **Scanner modules 数组中的每个模块都有对应 .md 文件**（数量必须一致）
- [ ] 模块数量合理：同一个包的子目录（storage/、middlewares/ 等）**已合并**到父模块文档，未单独拆分
- [ ] 每个模块文档：每个文件使用 `## 文件：xxx` 标题（不得用 `###` 或加粗代替）
- [ ] 每个模块文档：每个文件独立章节，无多文件合并
- [ ] 每个模块文档：核心文件包含代码示例
- [ ] 每个模块文档：所有文件章节都有"关键导出"和"依赖关系"
- [ ] 无完整代码堆砌 - 仅关键要点和简短示例
- [ ] CLAUDE.md 已更新，包含 `## Codebase Knowledge Base` 使用说明

## 使用示例

```
User: /codebase-init              # 默认批次大小 3
User: /codebase-init --batch=5   # 指定批次大小 5

Agent:
1. 轻量扫描：找出顶层 package.json（获取模块边界）
2. 派发 Scanner SubAgent：深度探索，返回结构化模块清单 JSON（含拆分决策）
3. 基于 Scanner 结果，创建 INDEX.md
4. 分批派发文档 SubAgent（批次大小=3，共 N 个模块，分 ⌈N/3⌉ 批）
   - 批次 1：并行处理模块 1-3，等待完成
   - 批次 2：并行处理模块 4-6，等待完成
   - ...
5. 验证并报告：成功创建 N 个模块文档
6. 更新 CLAUDE.md，写入 `.codebase` 使用说明
```

---
name: 'codebase-update'
description:
    '增量更新 .codebase 知识库。检测代码变更并仅更新受影响的模块文档。代码发生变更、用户请求 /codebase-update
    或定期维护时使用。'
---

# Codebase Update Skill

通过检测变更并仅更新受影响的模块文档，来增量更新 `.codebase` 知识库。

## 使用场景

- 项目代码已更改
- 用户明确请求 `/codebase-update`
- 文档的定期维护

## 执行流程

### 步骤 1：检测变更

根据项目类型选择检测方法：

#### 方法 1：Git Diff（推荐）

```bash
# 最近 10 次提交以来的变更
git diff --name-only HEAD~10 -- '*.ts' '*.tsx'

# 或使用标记记录上次更新时间
git diff codebase-last-update -- '*.ts' '*.tsx'
```

#### 方法 2：文件时间戳

比较 `.codebase/*.md` 的修改时间与源文件的时间戳。

#### 方法 3：手动指定

用户指定需要更新的模块。

### 步骤 2：分析影响

将变更文件映射到模块：

```
变更文件                             → 受影响的模块
─────────────────────────────────────────────────────────
packages/standard-agent/src/package.ts → standard-agent.md
packages/agent/src/graphBuilder.ts     → agent.md
zen-code/src/chat/hooks/useConfig.ts   → chat.md
```

### 步骤 3：筛选需要更新的模块

```typescript
interface UpdatePlan {
    module: string;
    reason: string;
    changedFiles: string[];
    priority: 'high' | 'medium' | 'low';
}
```

优先级标准：

- **high**：添加/删除文件、接口变更、破坏性变更
- **medium**：新增/修改导出函数
- **low**：内部实现变更、注释更新

### 步骤 4：派发 SubAgent（并行）

仅对需要更新的模块派发 SubAgent：

```
Main Agent
    │
    ├── SubAgent → 更新 standard-agent.md（高优先级）
    ├── SubAgent → 更新 chat.md（中优先级）
    └──（未变更的模块跳过）
```

#### SubAgent 任务模板

```
更新 .codebase/[output-path].md 文档。

变更原因: [reason for update]

变更文件:
- [file1]
- [file2]

要求:
1. 读取现有文档
2. 分析变更内容
3. 增量更新相关章节
4. 保持其他内容不变
5. 更新依赖关系如有变化

模块路径: [module-path]
输出文件: .codebase/[output-path].md
```

### 步骤 5：更新 INDEX.md

如果添加/删除了模块，相应更新 INDEX.md。

### 步骤 6：记录更新（可选）

```bash
# 创建标记以记录更新时间
git tag -f codebase-last-update
```

## SubAgent 任务数据

```json
{
    "module_path": "packages/standard-agent",
    "output_file": ".codebase/packages/standard-agent.md",
    "changed_files": ["src/package.ts", "src/repository.ts"],
    "reason": "Added createTool() method"
}
```

## 变更检测策略

| 策略      | 使用场景       | 优点       | 缺点         |
| --------- | -------------- | ---------- | ------------ |
| Git Diff  | Git 管理的项目 | 精确、快速 | 需要 Git     |
| Timestamp | 非 Git 项目    | 简单       | 不够精确     |
| Manual    | 针对性更新     | 可控       | 需要用户输入 |

## 智能更新逻辑

```typescript
function shouldUpdateModule(modulePath: string, changedFiles: string[]): { update: boolean; reason: string } {
    // 1. 直接文件变更
    if (changedFiles.some((f) => f.startsWith(modulePath))) {
        return { update: true, reason: 'direct_file_change' };
    }

    // 2. 依赖变更（分析导入）
    const deps = analyzeDependencies(modulePath);
    if (changedFiles.some((f) => deps.includes(f))) {
        return { update: true, reason: 'dependency_change' };
    }

    // 3. 共享类型变更
    if (changedFiles.some((f) => f.includes('types.ts') || f.includes('interfaces.ts'))) {
        return { update: true, reason: 'shared_type_change' };
    }

    return { update: false, reason: '' };
}
```

## 使用示例

```
User: /codebase-update

Agent:
1. 检测到 3 个文件变更
2. 分析影响：2 个模块需要更新
3. 派发 2 个 SubAgent 并行处理
4. 等待完成
5. 报告：更新了 standard-agent.md, chat.md
```

## 质量检查清单

完成前验证：

- [ ] 所有变更文件已映射到受影响的模块
- [ ] 仅更新必要的模块（效率）
- [ ] 更新的文档遵循模板结构
- [ ] 如有变化，更新依赖关系
- [ ] 如有模块添加/删除，更新 INDEX.md

## 与 codebase-init 的集成

此技能与 `codebase-init` 互补：

- **codebase-init**：完整创建（首次或重建）
- **codebase-update**：增量更新（持续维护）

---
name: prompt-versioning-system
description:
    Prompt 版本管理完整实现：主表+版本表分离设计，支持创建版本、查询历史、回滚到任意版本。包含数据库模型、API
    路由、SQLite 迁移逻辑、Agent Factory 适配。关键决策：指针式回滚（保留历史）、JOIN
    查询获取当前版本、迁移时临时禁用外键
tags:
    - prompt-versioning
    - database-design
    - sqlite
    - agent-system
    - schema-migration
    - zen-swarm
category: architecture
created: 2025-01-18
last_updated: 2025-02-19
priority: high
context_scope: project
---

# Prompt 版本管理系统

## 架构设计

### 主表+版本表分离

```sql
-- 主表：prompt 元信息
CREATE TABLE prompts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    current_version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 版本表：具体内容
CREATE TABLE prompt_versions (
    id TEXT PRIMARY KEY,
    prompt_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    content TEXT NOT NULL,
    metadata TEXT,
    change_note TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE,
    UNIQUE(prompt_id, version)
);
```

### 核心 API

| 方法                                                  | 功能                   | 说明                            |
| ----------------------------------------------------- | ---------------------- | ------------------------------- |
| `insertPrompt(data, content, changeNote?)`            | 创建 prompt + 初始版本 | 同时写入主表和版本表            |
| `createPromptVersion(promptId, content, changeNote?)` | 创建新版本             | `version = current_version + 1` |
| `getPromptVersion(promptId, version)`                 | 获取指定版本           | 查询特定版本内容                |
| `getPromptVersions(promptId)`                         | 获取版本历史           | 返回降序排列的所有版本          |
| `rollbackPromptVersion(promptId, targetVersion)`      | 回滚到指定版本         | 仅修改 `current_version` 指针   |
| `getPromptWithCurrentVersion(id)`                     | 获取当前版本内容       | 使用 JOIN 查询                  |

## 实现细节

### 1. 创建新版本

```typescript
// sqlite.ts
createPromptVersion(promptId, content, changeNote?) {
    return this.transaction(() => {
        const prompt = this.getPrompt(promptId);
        const newVersion = prompt.current_version + 1;

        // 插入版本记录
        const versionId = `${promptId}-v${newVersion}`;
        versionStmt.run(versionId, promptId, newVersion, content, changeNote, now);

        // 更新主表 current_version
        updateStmt.run(newVersion, now, promptId);
    });
}
```

### 2. 指针式回滚

```typescript
// sqlite.ts
rollbackPromptVersion(promptId, targetVersion) {
    return this.transaction(() => {
        // 仅修改 current_version 指针，不删除版本记录
        this.db.run(
            'UPDATE prompts SET current_version = ?, updated_at = ? WHERE id = ?',
            targetVersion,
            new Date().toISOString(),
            promptId
        );
    });
}
```

### 3. JOIN 查询当前版本

```sql
SELECT p.*, pv.content, pv.metadata, pv.change_note
FROM prompts p
JOIN prompt_versions pv ON p.id = pv.prompt_id AND p.current_version = pv.version
WHERE p.id = ?
```

### 4. API 路由实现

**文件**: `zen-swarm/src/api/prompts.ts`

- `list` / `get` / `getByName` - 返回当前版本内容
- `getVersions` - 获取所有版本历史（降序）
- `createVersion` - 创建新版本
- `rollbackVersion` - 回滚到指定版本

### 5. Agent Factory 适配

**文件**: `zen-swarm/src/agents/factory.ts:123`

```typescript
// 使用 getPromptWithContent 获取带版本的 prompt
const promptConfig = await pkg.getPromptWithContent(agentConfig.systemPromptId);
```

## 数据库迁移

**文件**: `packages/standard-agent/src/storage/sqlite.ts:241-270`

### 迁移逻辑

```typescript
// 1. 检查是否需要迁移
const hasContentColumn = tableInfo.some((col) => col.name === 'content');
if (!hasContentColumn) return; // 已迁移完成

// 2. 临时禁用外键
this.db.run('PRAGMA foreign_keys = OFF');

// 3. 清理可能存在的临时表
this.db.run('DROP TABLE IF EXISTS prompts_new');

// 4. 迁移数据到 prompt_versions
const prompts = this.db.prepare('SELECT id, content, created_at FROM prompts').all();
for (const p of prompts) {
    this.db.run(
        'INSERT INTO prompt_versions (id, prompt_id, version, content, created_at) VALUES (?, ?, 1, ?, ?)',
        `${p.id}-v1`,
        p.id,
        p.content,
        p.created_at,
    );
}

// 5. 重建 prompts 表（移除 content 列）
this.db.run(`CREATE TABLE prompts_new (...)`);
this.db.run(
    `INSERT INTO prompts_new SELECT id, name, COALESCE(current_version, 1), created_at, updated_at FROM prompts`,
);
this.db.run('DROP TABLE prompts');
this.db.run('ALTER TABLE prompts_new RENAME TO prompts');

// 6. 重新启用外键
this.db.run('PRAGMA foreign_keys = ON');
```

## 关键设计决策

| 决策           | 理由                               |
| -------------- | ---------------------------------- |
| 指针式回滚     | 保留完整历史，支持未来分析         |
| JOIN 查询      | 一次查询获取完整信息               |
| 版本号自动递增 | `newVersion = current_version + 1` |
| 迁移时禁用外键 | 避免外键约束导致删除失败           |

## 迁移注意事项

1. **检测已迁移状态**：检查 `content` 列是否存在
2. **清理临时表**：使用 `DROP TABLE IF EXISTS prompts_new`
3. **数据完整性**：迁移前确保 `prompt_versions` 表数据已同步
4. **重建表时禁用外键**：避免 `agents` 表外键约束导致删除失败

## 适用场景

- Agent 系统的 prompt 版本管理
- 需要 A/B 测试不同 prompt 版本
- 需要回滚能力的配置管理系统
- SQLite 数据库迁移（表结构变更）

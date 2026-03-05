# Zen Swarm 数据库层优化建议

**涉及文件**: `config/loader.ts`, `cron/storage.ts`, `config/workspace-storage.ts`, `services/provider/storage.ts`

---

## 1. 核心问题：五个独立数据库连接

### 当前状态

```typescript
// loader.ts
const sharedDb = new Database('./data/index.db', { create: true }); // 连接 1
const agentStorage = new BunSqliteStorage('./data/index.db'); // 连接 2
const mcpStorage = new ZenSwarmMcpStorage('./data/index.db'); // 连接 3
const providerStorage = new ProviderStorage('./data/index.db'); // 连接 4
const cronStorage = new CronStorage('./data/index.db'); // 连接 5
```

### 风险分析

**风险 1: 外键约束不一致**

`sharedDb` 在创建时执行了：

```typescript
sharedDb.run('PRAGMA foreign_keys = ON');
sharedDb.run('PRAGMA journal_mode = WAL');
```

但 `agentStorage`、`cronStorage` 等通过路径字符串自行创建连接，各自的 PRAGMA 设置未知。若某个连接未开启
`foreign_keys`，跨表约束在该连接上将不生效，可能插入孤立记录。

**风险 2: WAL checkpoint 竞争**

多个写连接同时触发 WAL checkpoint，产生锁等待。SQLite
WAL 模式允许多读单写，多个写连接会退化为串行，并增加 checkpoint 冲突概率。

**风险 3: 连接数占用**

Bun SQLite 每个连接占用文件描述符，5 个连接 × 服务器生命周期 = 持续占用资源。

### 建议方案

**方案 A（最小改动）**: 将 `sharedDb` 实例注入所有存储类

```typescript
// loader.ts
const sharedDb = new Database('./data/index.db', { create: true });
sharedDb.run('PRAGMA foreign_keys = ON');
sharedDb.run('PRAGMA journal_mode = WAL');

// 所有存储类改为接受 Database 实例而非路径字符串
const agentStorage = new BunSqliteStorage(sharedDb);
const mcpStorage = new ZenSwarmMcpStorage(sharedDb);
const providerStorage = new ProviderStorage(sharedDb);
const cronStorage = new CronStorage(sharedDb);
```

每个存储类在构造函数中判断参数类型：

```typescript
constructor(dbOrPath: Database | string) {
    this.db = typeof dbOrPath === 'string'
        ? new Database(dbOrPath, { create: true })
        : dbOrPath;
}
```

**方案 B（推荐，中期）**: 创建 `DatabaseManager` 单例统一管理

```typescript
class DatabaseManager {
    private static instance: Database;

    static get(): Database {
        if (!this.instance) {
            this.instance = new Database('./data/index.db', { create: true });
            this.instance.run('PRAGMA foreign_keys = ON');
            this.instance.run('PRAGMA journal_mode = WAL');
            this.instance.run('PRAGMA busy_timeout = 5000'); // 5秒等锁超时
        }
        return this.instance;
    }
}
```

---

## 2. 缺少 `busy_timeout` 设置

当前没有设置 `PRAGMA busy_timeout`，SQLite 在遇到写锁时立即返回 `SQLITE_BUSY`
错误。Cron 任务并发执行时（多个任务同时写入日志表）可能导致写入失败但无错误提示。

**建议**:

```typescript
sharedDb.run('PRAGMA busy_timeout = 5000'); // 等待最多 5 秒
```

---

## 3. 缺少数据库迁移系统

当前各存储类在 `initialize()` 中直接执行
`CREATE TABLE IF NOT EXISTS`。当需要修改表结构（增加列、修改约束）时，没有迁移版本控制，只能手动操作数据库。

**建议**: 引入简单的迁移表：

```sql
CREATE TABLE IF NOT EXISTS _migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
);
```

每次启动时检查版本，按序执行未应用的迁移脚本。可以是轻量实现（20-30 行），不必引入第三方库。

---

## 4. Workspace 排序逻辑与注释矛盾

```typescript
// workspace-storage.ts
// 按创建时间排序（固定顺序，不用访问时间排序）
ORDER BY created_at DESC
```

注释说明不用访问时间排序，但如果用户期望最近访问的 workspace 排在前面（类似 VS
Code 的最近项目列表），当前排序会造成困惑。

`last_accessed_at` 字段已存在于表中，但未用于排序。建议明确产品决策：

- 若要按访问时间排序：改为 `ORDER BY last_accessed_at DESC NULLS LAST`
- 若确认按创建时间：删除 `last_accessed_at` 字段避免误导

---

## 5. Cron 日志表无分区/清理机制

Cron 任务每次执行都写入 `cron_logs` 表，无自动清理。运行 6 个月后，高频任务（每分钟执行）会产生
`6 × 30 × 24 × 60 = 259,200` 条日志记录。

当前 tRPC 接口支持分页查询日志，但没有自动删除旧日志的机制。

**建议**:

1. 保留最近 N 条日志（按任务 ID 分组，默认保留最近 100 条）
2. 或按时间清理（保留最近 30 天）
3. 在调度器启动时或每天执行一次清理

```sql
-- 按任务保留最近 100 条
DELETE FROM cron_logs
WHERE id NOT IN (
    SELECT id FROM cron_logs
    WHERE cron_task_id = ?
    ORDER BY created_at DESC
    LIMIT 100
) AND cron_task_id = ?;
```

---

## 6. 事务使用不一致

部分写操作（如 Cron 任务触发时先 `insertLog` 再 `updateLog`）分两步执行，中间若进程崩溃会留下 `pending` 状态的孤立日志。

**建议**: 将关联的写操作包在事务中：

```typescript
// 示例：原子性创建并标记运行中
const logId = db.transaction(() => {
    const id = insertLog({ status: 'pending', ... });
    updateLog(id, { status: 'running' });
    return id;
})();
```

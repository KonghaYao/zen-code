/**
 * Cron 任务存储
 * 使用 SQLite 存储任务和日志
 */

import Database from 'bun:sqlite';
import type {
    CronTask,
    CronTaskInput,
    CronTaskRow,
    CronLog,
    CronLogInput,
    CronLogRow,
    UpdateCronTaskInput,
} from './types.js';

export class CronStorage {
    private db: Database;

    constructor(dbPath: string = './data/index.db') {
        this.db = new Database(dbPath, { create: true });
        this.db.run('PRAGMA foreign_keys = ON');
        this.db.run('PRAGMA journal_mode = WAL'); // 提高并发性能
    }

    async initialize(): Promise<void> {
        this.createTables();
    }

    private createTables(): void {
        // 创建 cron_tasks 表
        this.db.run(`
            CREATE TABLE IF NOT EXISTS cron_tasks (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                cron_expression TEXT NOT NULL,
                prompt TEXT NOT NULL,
                agent_id TEXT NOT NULL,
                enabled INTEGER DEFAULT 1,
                max_retries INTEGER DEFAULT 0,
                variables TEXT DEFAULT '{}',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 创建 cron_logs 表
        this.db.run(`
            CREATE TABLE IF NOT EXISTS cron_logs (
                id TEXT PRIMARY KEY,
                cron_task_id TEXT NOT NULL,
                thread_id TEXT,
                status TEXT NOT NULL,
                started_at TEXT NOT NULL,
                finished_at TEXT,
                error_message TEXT,
                retry_count INTEGER DEFAULT 0,
                queued_at TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (cron_task_id) REFERENCES cron_tasks(id) ON DELETE CASCADE
            );
        `);

        // 创建索引
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_cron_tasks_enabled ON cron_tasks(enabled);`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_cron_logs_task_id ON cron_logs(cron_task_id);`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_cron_logs_status ON cron_logs(status);`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_cron_logs_created_at ON cron_logs(created_at);`);
    }

    // ========================================
    // Task Operations
    // ========================================

    async getAllTasks(): Promise<CronTask[]> {
        const stmt = this.db.prepare('SELECT * FROM cron_tasks ORDER BY created_at DESC');
        const rows = stmt.all() as CronTaskRow[];
        return rows.map((row) => this.rowToTask(row));
    }

    async getTask(id: string): Promise<CronTask | null> {
        const stmt = this.db.prepare('SELECT * FROM cron_tasks WHERE id = ?');
        const row = stmt.get(id) as CronTaskRow | null | undefined;
        return row ? this.rowToTask(row) : null;
    }

    async getEnabledTasks(): Promise<CronTask[]> {
        const stmt = this.db.prepare('SELECT * FROM cron_tasks WHERE enabled = 1 ORDER BY created_at DESC');
        const rows = stmt.all() as CronTaskRow[];
        return rows.map((row) => this.rowToTask(row));
    }

    async insertTask(task: CronTaskInput): Promise<void> {
        // Check if id already exists
        const checkStmt = this.db.prepare('SELECT id FROM cron_tasks WHERE id = ?');
        const existing = checkStmt.get(task.id) as { id: string } | null | undefined;

        if (existing) {
            throw new Error(`Cron task with id "${task.id}" already exists`);
        }

        const stmt = this.db.prepare(`
            INSERT INTO cron_tasks (id, name, description, cron_expression, prompt, agent_id, enabled, max_retries, variables, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const now = this.now();
        stmt.run(
            task.id,
            task.name,
            task.description ?? null,
            task.cron_expression,
            task.prompt,
            task.agent_id,
            this.boolToInt(task.enabled ?? true),
            task.max_retries ?? 0,
            JSON.stringify(task.variables ?? {}),
            now,
            now,
        );
    }

    async updateTask(task: UpdateCronTaskInput): Promise<void> {
        const existing = await this.getTask(task.id);
        if (!existing) {
            throw new Error(`Cron task with id ${task.id} not found`);
        }

        const stmt = this.db.prepare(`
            UPDATE cron_tasks
            SET name = ?, description = ?, cron_expression = ?, prompt = ?, agent_id = ?, enabled = ?, max_retries = ?, variables = ?, updated_at = ?
            WHERE id = ?
        `);

        stmt.run(
            task.name ?? existing.name,
            task.description ?? existing.description ?? null,
            task.cron_expression ?? existing.cron_expression,
            task.prompt ?? existing.prompt,
            task.agent_id ?? existing.agent_id,
            this.boolToInt(task.enabled ?? existing.enabled),
            task.max_retries ?? existing.max_retries,
            JSON.stringify(task.variables ?? existing.variables),
            this.now(),
            task.id,
        );
    }

    async deleteTask(id: string): Promise<void> {
        const stmt = this.db.prepare('DELETE FROM cron_tasks WHERE id = ?');
        const result = stmt.run(id);

        if (result.changes === 0) {
            throw new Error(`Cron task with id ${id} not found`);
        }
    }

    // ========================================
    // Log Operations
    // ========================================

    async getLogsByTaskId(taskId: string, limit: number = 50, offset: number = 0): Promise<CronLog[]> {
        const stmt = this.db.prepare(
            'SELECT * FROM cron_logs WHERE cron_task_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        );
        const rows = stmt.all(taskId, limit, offset) as CronLogRow[];
        return rows.map((row) => this.rowToLog(row));
    }

    async getRecentLogs(limit: number = 50): Promise<CronLog[]> {
        const stmt = this.db.prepare('SELECT * FROM cron_logs ORDER BY created_at DESC LIMIT ?');
        const rows = stmt.all(limit) as CronLogRow[];
        return rows.map((row) => this.rowToLog(row));
    }

    async getLog(id: string): Promise<CronLog | null> {
        const stmt = this.db.prepare('SELECT * FROM cron_logs WHERE id = ?');
        const row = stmt.get(id) as CronLogRow | null | undefined;
        return row ? this.rowToLog(row) : null;
    }

    async insertLog(log: Omit<CronLogInput, 'id'>): Promise<string> {
        const id = crypto.randomUUID();
        const stmt = this.db.prepare(`
            INSERT INTO cron_logs (id, cron_task_id, thread_id, status, started_at, finished_at, error_message, retry_count, queued_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            id,
            log.cron_task_id,
            log.thread_id ?? null,
            log.status,
            log.started_at,
            log.finished_at ?? null,
            log.error_message ?? null,
            log.retry_count,
            log.queued_at ?? null,
            this.now(),
        );

        return id;
    }

    async updateLog(id: string, updates: Partial<Omit<CronLogInput, 'id' | 'cron_task_id'>>): Promise<void> {
        const existing = await this.getLog(id);
        if (!existing) {
            throw new Error(`Cron log with id ${id} not found`);
        }

        const stmt = this.db.prepare(`
            UPDATE cron_logs
            SET thread_id = ?, status = ?, finished_at = ?, error_message = ?, retry_count = ?, queued_at = ?
            WHERE id = ?
        `);

        stmt.run(
            updates.thread_id ?? existing.thread_id ?? null,
            updates.status ?? existing.status,
            updates.finished_at ?? existing.finished_at ?? null,
            updates.error_message ?? existing.error_message ?? null,
            updates.retry_count ?? existing.retry_count,
            updates.queued_at ?? existing.queued_at ?? null,
            id,
        );
    }

    async deleteLogsBefore(taskId: string, before: string): Promise<number> {
        const stmt = this.db.prepare('DELETE FROM cron_logs WHERE cron_task_id = ? AND created_at < ?');
        const result = stmt.run(taskId, before);
        return result.changes;
    }

    async clearLogsByTaskId(taskId: string): Promise<number> {
        const stmt = this.db.prepare('DELETE FROM cron_logs WHERE cron_task_id = ?');
        const result = stmt.run(taskId);
        return result.changes;
    }

    // ========================================
    // Utility Methods
    // ========================================

    private rowToTask(row: CronTaskRow): CronTask {
        return {
            id: row.id,
            name: row.name,
            description: row.description ?? undefined,
            cron_expression: row.cron_expression,
            prompt: row.prompt,
            agent_id: row.agent_id,
            enabled: row.enabled === 1,
            max_retries: row.max_retries,
            variables: JSON.parse(row.variables || '{}'),
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }

    private rowToLog(row: CronLogRow): CronLog {
        return {
            id: row.id,
            cron_task_id: row.cron_task_id,
            thread_id: row.thread_id ?? undefined,
            status: row.status as CronLog['status'],
            started_at: row.started_at,
            finished_at: row.finished_at ?? undefined,
            error_message: row.error_message ?? undefined,
            retry_count: row.retry_count,
            queued_at: row.queued_at ?? undefined,
            created_at: row.created_at,
        };
    }

    private now(): string {
        return new Date().toISOString();
    }

    private boolToInt(value: boolean): number {
        return value ? 1 : 0;
    }

    close(): void {
        this.db.close();
    }
}

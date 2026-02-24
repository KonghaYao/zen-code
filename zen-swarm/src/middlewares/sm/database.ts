/**
 * State Machine Database Layer
 *
 * SQLite-based persistence for state machine definitions, instances, and transitions
 *
 * Supports dependency injection:
 * - Pass an existing Database instance for shared connection
 * - Or provide a dbPath to create a new connection
 */

import Database from 'bun:sqlite';
import { join } from 'path';
import {
    StateMachineDefinitionRow,
    StateInstanceRow,
    StateTransitionRow,
    StateMachineDefinition,
    StateInstance,
    StateInstanceStatus,
    SMError,
} from './types.js';

/**
 * SMDatabase configuration
 */
export interface SMDatabaseConfig {
    /**
     * Existing Database instance (for shared connection)
     * If provided, dbPath is ignored
     */
    db?: Database;

    /**
     * Path to SQLite database file
     * Only used if db is not provided
     */
    dbPath?: string;
}

/**
 * State Machine Database Manager
 *
 * Handles all SQLite operations for state machine persistence
 */
export class SMDatabase {
    private db: Database;
    private dbPath: string | null = null;
    private ownsDb: boolean;

    /**
     * Create SMDatabase instance
     *
     * @param config - Configuration object or dbPath string (for backward compatibility)
     *
     * @example
     * // With dependency injection (recommended for zen-swarm)
     * const db = new Database('./data/index.db');
     * const smDb = new SMDatabase({ db });
     *
     * // With dbPath (standalone usage)
     * const smDb = new SMDatabase({ dbPath: './state-machines.db' });
     *
     * // Backward compatible
     * const smDb = new SMDatabase('./state-machines.db');
     */
    constructor(config?: SMDatabaseConfig | string) {
        if (typeof config === 'string') {
            // Backward compatible: config is dbPath
            this.dbPath = config;
            this.db = new Database(this.dbPath, { create: true });
            this.ownsDb = true;
        } else if (config?.db) {
            // Dependency injection: use existing Database
            this.db = config.db;
            this.ownsDb = false;
        } else {
            // Create new Database with provided or default path
            this.dbPath = config?.dbPath || SMDatabase.getDefaultPath();
            this.db = new Database(this.dbPath, { create: true });
            this.ownsDb = true;
        }

        this.db.run('PRAGMA foreign_keys = ON');
        this.db.run('PRAGMA journal_mode = WAL');
    }

    /**
     * Get default database path
     */
    static getDefaultPath(): string {
        const home = process.env.HOME || process.env.USERPROFILE || '.';
        return join(home, '.zen-code', 'state-machines.db');
    }

    /**
     * Create database with default path
     */
    static default(): SMDatabase {
        return new SMDatabase();
    }

    /**
     * Create SMDatabase from existing Database instance
     *
     * @example
     * const db = new Database('./data/index.db');
     * const smDb = SMDatabase.fromDatabase(db);
     */
    static fromDatabase(db: Database): SMDatabase {
        return new SMDatabase({ db });
    }

    // ========================================
    // Lifecycle
    // ========================================

    /**
     * Initialize database schema
     */
    async initialize(): Promise<void> {
        // Create tables directly instead of reading from file
        // This avoids issues with SQL parsing and comments
        this.db.run(`
            CREATE TABLE IF NOT EXISTS state_machine_definitions (
                machine_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                definition TEXT NOT NULL,
                metadata TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS state_instances (
                state_id TEXT PRIMARY KEY,
                machine_id TEXT NOT NULL,
                current_state TEXT NOT NULL,
                context TEXT,
                status TEXT NOT NULL DEFAULT 'active',
                parent_state_id TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (machine_id) REFERENCES state_machine_definitions(machine_id) ON DELETE CASCADE
            )
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS state_transitions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                state_id TEXT NOT NULL,
                machine_id TEXT NOT NULL,
                from_state TEXT NOT NULL,
                to_state TEXT NOT NULL,
                event_name TEXT NOT NULL,
                event_payload TEXT,
                context_before TEXT,
                context_after TEXT,
                error TEXT,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (state_id) REFERENCES state_instances(state_id) ON DELETE CASCADE
            )
        `);

        // Create indexes
        this.db.run('CREATE INDEX IF NOT EXISTS idx_state_instances_machine_id ON state_instances(machine_id)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_state_instances_status ON state_instances(status)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_state_instances_parent ON state_instances(parent_state_id)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_state_transitions_state_id ON state_transitions(state_id)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_state_transitions_timestamp ON state_transitions(timestamp)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_state_transitions_machine_id ON state_transitions(machine_id)');
    }

    /**
     * Close database connection
     *
     * Note: Only closes the connection if this instance owns it.
     * If the Database was injected, the caller is responsible for closing it.
     */
    async close(): Promise<void> {
        if (this.ownsDb) {
            this.db.close();
        }
    }

    /**
     * Run a transaction
     */
    async transaction<T>(fn: () => T | Promise<T>): Promise<T> {
        const tx = this.db.transaction(fn);
        return tx();
    }

    // ========================================
    // State Machine Definitions
    // ========================================

    /**
     * Insert a new state machine definition
     */
    async insertMachineDefinition(definition: StateMachineDefinition): Promise<void> {
        const stmt = this.db.prepare(`
            INSERT INTO state_machine_definitions 
            (machine_id, name, description, definition, metadata, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const now = this.now();
        stmt.run(
            definition.id,
            definition.name,
            definition.description || null,
            JSON.stringify(definition),
            JSON.stringify(definition.meta || {}),
            now,
            now,
        );
    }

    /**
     * Get a state machine definition by ID
     */
    async getMachineDefinition(machineId: string): Promise<StateMachineDefinition | undefined> {
        const stmt = this.db.prepare('SELECT * FROM state_machine_definitions WHERE machine_id = ?');
        const row = stmt.get(machineId) as StateMachineDefinitionRow | undefined;

        if (!row) return undefined;

        return JSON.parse(row.definition) as StateMachineDefinition;
    }

    /**
     * Get all state machine definitions
     */
    async getAllMachineDefinitions(): Promise<StateMachineDefinition[]> {
        const stmt = this.db.prepare('SELECT * FROM state_machine_definitions ORDER BY created_at DESC');
        const rows = stmt.all() as StateMachineDefinitionRow[];

        return rows.map((row) => JSON.parse(row.definition) as StateMachineDefinition);
    }

    /**
     * Update a state machine definition
     */
    async updateMachineDefinition(definition: StateMachineDefinition): Promise<void> {
        const stmt = this.db.prepare(`
            UPDATE state_machine_definitions
            SET name = ?, description = ?, definition = ?, metadata = ?, updated_at = ?
            WHERE machine_id = ?
        `);

        const result = stmt.run(
            definition.name,
            definition.description || null,
            JSON.stringify(definition),
            JSON.stringify(definition.meta || {}),
            this.now(),
            definition.id,
        );

        if (result.changes === 0) {
            throw new SMError('MACHINE_NOT_FOUND', `Machine definition '${definition.id}' not found`);
        }
    }

    /**
     * Delete a state machine definition
     */
    async deleteMachineDefinition(machineId: string): Promise<void> {
        return this.transaction(async () => {
            // Check for active instances
            const countStmt = this.db.prepare(
                'SELECT COUNT(*) as count FROM state_instances WHERE machine_id = ? AND status = ?',
            );
            const { count } = countStmt.get(machineId, 'active') as { count: number };

            if (count > 0) {
                throw new SMError(
                    'DATABASE_ERROR',
                    `Cannot delete machine '${machineId}': ${count} active instance(s) exist`,
                );
            }

            const stmt = this.db.prepare('DELETE FROM state_machine_definitions WHERE machine_id = ?');
            const result = stmt.run(machineId);

            if (result.changes === 0) {
                throw new SMError('MACHINE_NOT_FOUND', `Machine definition '${machineId}' not found`);
            }
        });
    }

    // ========================================
    // State Instances
    // ========================================

    /**
     * Create a new state instance
     */
    async createStateInstance(
        stateId: string,
        machineId: string,
        initialState: string,
        context: Record<string, unknown>,
        parentStateId?: string,
    ): Promise<StateInstance> {
        return this.transaction(() => {
            const now = this.now();
            const stmt = this.db.prepare(`
                INSERT INTO state_instances
                (state_id, machine_id, current_state, context, status, parent_state_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                stateId,
                machineId,
                initialState,
                JSON.stringify(context),
                'active',
                parentStateId || null,
                now,
                now,
            );

            return {
                state_id: stateId,
                machine_id: machineId,
                current_state: initialState,
                context,
                status: 'active' as StateInstanceStatus,
                parent_state_id: parentStateId || null,
                created_at: new Date(now),
                updated_at: new Date(now),
            };
        });
    }

    /**
     * Get a state instance by ID
     */
    async getStateInstance(stateId: string): Promise<StateInstance | undefined> {
        const stmt = this.db.prepare('SELECT * FROM state_instances WHERE state_id = ?');
        const row = stmt.get(stateId) as StateInstanceRow | undefined;

        if (!row) return undefined;

        return this.rowToStateInstance(row);
    }

    /**
     * Get all state instances for a machine
     */
    async getStateInstancesByMachine(machineId: string, status?: StateInstanceStatus): Promise<StateInstance[]> {
        let stmt;
        if (status) {
            stmt = this.db.prepare(
                'SELECT * FROM state_instances WHERE machine_id = ? AND status = ? ORDER BY created_at DESC',
            );
            const rows = stmt.all(machineId, status) as StateInstanceRow[];
            return rows.map((row) => this.rowToStateInstance(row));
        } else {
            stmt = this.db.prepare('SELECT * FROM state_instances WHERE machine_id = ? ORDER BY created_at DESC');
            const rows = stmt.all(machineId) as StateInstanceRow[];
            return rows.map((row) => this.rowToStateInstance(row));
        }
    }

    /**
     * Get all state instances
     */
    async getAllStateInstances(status?: StateInstanceStatus): Promise<StateInstance[]> {
        let stmt;
        if (status) {
            stmt = this.db.prepare('SELECT * FROM state_instances WHERE status = ? ORDER BY created_at DESC');
            const rows = stmt.all(status) as StateInstanceRow[];
            return rows.map((row) => this.rowToStateInstance(row));
        } else {
            stmt = this.db.prepare('SELECT * FROM state_instances ORDER BY created_at DESC');
            const rows = stmt.all() as StateInstanceRow[];
            return rows.map((row) => this.rowToStateInstance(row));
        }
    }

    /**
     * Update a state instance
     */
    async updateStateInstance(
        stateId: string,
        currentState: string,
        context: Record<string, unknown>,
        status?: StateInstanceStatus,
    ): Promise<void> {
        const stmt = this.db.prepare(`
            UPDATE state_instances
            SET current_state = ?, context = ?, status = ?, updated_at = ?
            WHERE state_id = ?
        `);

        const result = stmt.run(currentState, JSON.stringify(context), status || 'active', this.now(), stateId);

        if (result.changes === 0) {
            throw new SMError('STATE_NOT_FOUND', `State instance '${stateId}' not found`);
        }
    }

    /**
     * Delete a state instance and its transitions
     */
    async deleteStateInstance(stateId: string): Promise<void> {
        return this.transaction(() => {
            // Delete transitions first (cascade)
            const transitionStmt = this.db.prepare('DELETE FROM state_transitions WHERE state_id = ?');
            transitionStmt.run(stateId);

            // Delete instance
            const stmt = this.db.prepare('DELETE FROM state_instances WHERE state_id = ?');
            const result = stmt.run(stateId);

            if (result.changes === 0) {
                throw new SMError('STATE_NOT_FOUND', `State instance '${stateId}' not found`);
            }
        });
    }

    // ========================================
    // State Transitions
    // ========================================

    /**
     * Record a state transition
     */
    async recordTransition(
        stateId: string,
        machineId: string,
        fromState: string,
        toState: string,
        eventName: string,
        eventPayload?: Record<string, unknown>,
        contextBefore?: Record<string, unknown>,
        contextAfter?: Record<string, unknown>,
        error?: string,
    ): Promise<number> {
        const stmt = this.db.prepare(`
            INSERT INTO state_transitions
            (state_id, machine_id, from_state, to_state, event_name, event_payload, 
             context_before, context_after, error, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            stateId,
            machineId,
            fromState,
            toState,
            eventName,
            eventPayload ? JSON.stringify(eventPayload) : null,
            contextBefore ? JSON.stringify(contextBefore) : null,
            contextAfter ? JSON.stringify(contextAfter) : null,
            error || null,
            this.now(),
        );

        return result.lastInsertRowid as number;
    }

    /**
     * Get transition history for a state instance
     */
    async getTransitionHistory(
        stateId: string,
        limit: number = 50,
        beforeTransitionId?: number,
    ): Promise<StateTransitionRow[]> {
        let stmt;
        if (beforeTransitionId) {
            stmt = this.db.prepare(`
                SELECT * FROM state_transitions 
                WHERE state_id = ? AND id < ?
                ORDER BY id DESC
                LIMIT ?
            `);
            return stmt.all(stateId, beforeTransitionId, limit) as StateTransitionRow[];
        } else {
            stmt = this.db.prepare(`
                SELECT * FROM state_transitions 
                WHERE state_id = ?
                ORDER BY id DESC
                LIMIT ?
            `);
            return stmt.all(stateId, limit) as StateTransitionRow[];
        }
    }

    /**
     * Get a specific transition by ID
     */
    async getTransition(transitionId: number): Promise<StateTransitionRow | undefined> {
        const stmt = this.db.prepare('SELECT * FROM state_transitions WHERE id = ?');
        return stmt.get(transitionId) as StateTransitionRow | undefined;
    }

    /**
     * Delete transitions older than a date
     */
    async deleteOldTransitions(beforeDate: Date): Promise<number> {
        const stmt = this.db.prepare('DELETE FROM state_transitions WHERE timestamp < ?');
        const result = stmt.run(beforeDate.toISOString());
        return result.changes;
    }

    // ========================================
    // Helpers
    // ========================================

    /**
     * Convert database row to StateInstance
     */
    private rowToStateInstance(row: StateInstanceRow): StateInstance {
        return {
            state_id: row.state_id,
            machine_id: row.machine_id,
            current_state: row.current_state,
            context: row.context ? JSON.parse(row.context) : {},
            status: row.status as StateInstanceStatus,
            parent_state_id: row.parent_state_id,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
        };
    }

    /**
     * Get current ISO timestamp
     */
    private now(): string {
        return new Date().toISOString();
    }
}

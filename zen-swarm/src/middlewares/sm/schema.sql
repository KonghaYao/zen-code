-- State Machine Middleware Schema
-- SQLite tables for XState-based state machine management

-- State Machine Definitions Table
-- Stores the serialized state machine definitions (workflow templates)
CREATE TABLE IF NOT EXISTS state_machine_definitions (
    machine_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    definition TEXT NOT NULL,  -- JSON serialized state machine definition
    metadata TEXT,             -- Additional metadata (version, author, etc.)
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- State Instances Table
-- Stores runtime state instances (workflow executions)
CREATE TABLE IF NOT EXISTS state_instances (
    state_id TEXT PRIMARY KEY,
    machine_id TEXT NOT NULL,
    current_state TEXT NOT NULL,
    context TEXT,              -- JSON serialized context data
    status TEXT NOT NULL DEFAULT 'active',  -- active, completed, failed, paused
    parent_state_id TEXT,      -- For nested state machines
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (machine_id) REFERENCES state_machine_definitions(machine_id) ON DELETE CASCADE
);

-- State Transitions History Table
-- Records all state transitions for audit and rollback
CREATE TABLE IF NOT EXISTS state_transitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    state_id TEXT NOT NULL,
    machine_id TEXT NOT NULL,
    from_state TEXT NOT NULL,
    to_state TEXT NOT NULL,
    event_name TEXT NOT NULL,
    event_payload TEXT,        -- JSON serialized event data
    context_before TEXT,       -- Context before transition
    context_after TEXT,        -- Context after transition
    error TEXT,                -- Error message if transition failed
    timestamp TEXT NOT NULL,
    FOREIGN KEY (state_id) REFERENCES state_instances(state_id) ON DELETE CASCADE
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_state_instances_machine_id ON state_instances(machine_id);
CREATE INDEX IF NOT EXISTS idx_state_instances_status ON state_instances(status);
CREATE INDEX IF NOT EXISTS idx_state_instances_parent ON state_instances(parent_state_id);
CREATE INDEX IF NOT EXISTS idx_state_transitions_state_id ON state_transitions(state_id);
CREATE INDEX IF NOT EXISTS idx_state_transitions_timestamp ON state_transitions(timestamp);
CREATE INDEX IF NOT EXISTS idx_state_transitions_machine_id ON state_transitions(machine_id);

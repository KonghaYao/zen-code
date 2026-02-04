-- ========================================
-- Standard Agent SQLite Schema
-- ========================================

-- Enable WAL mode for better performance
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ========================================
-- Models Table
-- ========================================
CREATE TABLE IF NOT EXISTS models (
    id TEXT PRIMARY KEY NOT NULL,
    model_name TEXT NOT NULL,
    model_provider TEXT NOT NULL,
    stream_usage INTEGER NOT NULL DEFAULT 0,
    enable_thinking INTEGER NOT NULL DEFAULT 0,
    temperature REAL NOT NULL DEFAULT 0.7,
    max_tokens INTEGER NOT NULL DEFAULT 4096,
    top_p REAL NOT NULL DEFAULT 1.0,
    frequency_penalty REAL NOT NULL DEFAULT 0.0,
    presence_penalty REAL NOT NULL DEFAULT 0.0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ========================================
-- Prompts Table
-- ========================================
CREATE TABLE IF NOT EXISTS prompts (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ========================================
-- Tools Table (Schema only)
-- ========================================
CREATE TABLE IF NOT EXISTS tools (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ========================================
-- Middlewares Table (Schema only)
-- ========================================
CREATE TABLE IF NOT EXISTS middlewares (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ========================================
-- Agents Table
-- ========================================
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    system_prompt_id TEXT NOT NULL,
    model_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (system_prompt_id) REFERENCES prompts(id) ON DELETE RESTRICT,
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE RESTRICT
);

-- ========================================
-- Agent Tools Junction Table
-- ========================================
CREATE TABLE IF NOT EXISTS agent_tools (
    agent_id TEXT NOT NULL,
    tool_id TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    custom_params TEXT,
    PRIMARY KEY (agent_id, tool_id),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE CASCADE
);

-- ========================================
-- Agent Middlewares Junction Table
-- ========================================
CREATE TABLE IF NOT EXISTS agent_middlewares (
    agent_id TEXT NOT NULL,
    middleware_id TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    custom_params TEXT,
    PRIMARY KEY (agent_id, middleware_id),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    FOREIGN KEY (middleware_id) REFERENCES middlewares(id) ON DELETE CASCADE
);

-- ========================================
-- Indexes for Performance
-- ========================================
CREATE INDEX IF NOT EXISTS idx_prompts_name ON prompts(name);
CREATE INDEX IF NOT EXISTS idx_agent_tools_agent ON agent_tools(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_tools_tool ON agent_tools(tool_id);
CREATE INDEX IF NOT EXISTS idx_agent_middlewares_agent ON agent_middlewares(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_middlewares_middleware ON agent_middlewares(middleware_id);

-- ========================================
-- Triggers for Updated Timestamps
-- ========================================
CREATE TRIGGER IF NOT EXISTS update_models_timestamp
AFTER UPDATE ON models
BEGIN
    UPDATE models SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_prompts_timestamp
AFTER UPDATE ON prompts
BEGIN
    UPDATE prompts SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_tools_timestamp
AFTER UPDATE ON tools
BEGIN
    UPDATE tools SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_middlewares_timestamp
AFTER UPDATE ON middlewares
BEGIN
    UPDATE middlewares SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_agents_timestamp
AFTER UPDATE ON agents
BEGIN
    UPDATE agents SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- SkillPkg Database Schema
-- TimescaleDB (PostgreSQL superset)

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  github_id TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skills (packages) table
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  scope TEXT,  -- org scope e.g. "@org"
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  description TEXT,
  keywords TEXT[] DEFAULT '{}',
  is_private BOOLEAN DEFAULT FALSE,
  latest_version TEXT,
  downloads_total BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skill versions table
CREATE TABLE IF NOT EXISTS skill_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  tarball_url TEXT NOT NULL,
  integrity TEXT NOT NULL,  -- sha512 hash
  skill_json JSONB NOT NULL,
  readme TEXT,
  published_by UUID REFERENCES users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  deprecated BOOLEAN DEFAULT FALSE,
  deprecation_message TEXT,
  UNIQUE(skill_id, version)
);

-- Version tags (latest, stable, next, etc.)
CREATE TABLE IF NOT EXISTS skill_tags (
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  version TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (skill_id, tag)
);

-- API Tokens
CREATE TABLE IF NOT EXISTS api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Skill ownership (for org/scope support)
CREATE TABLE IF NOT EXISTS skill_collaborators (
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'read',  -- 'read' | 'write' | 'admin'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (skill_id, user_id)
);

-- ======================
-- TimescaleDB Hypertables
-- ======================

-- Download events (time-series)
CREATE TABLE IF NOT EXISTS download_events (
  time TIMESTAMPTZ NOT NULL,
  skill_id UUID NOT NULL,
  version TEXT NOT NULL,
  user_id UUID,
  ip_hash TEXT,
  cli_version TEXT,
  country_code TEXT
);
SELECT create_hypertable('download_events', 'time', if_not_exists => TRUE);

-- API request monitoring (time-series)
CREATE TABLE IF NOT EXISTS api_requests (
  time TIMESTAMPTZ NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INT NOT NULL,
  latency_ms INT NOT NULL,
  user_id UUID
);
SELECT create_hypertable('api_requests', 'time', if_not_exists => TRUE);

-- Publish history (time-series)
CREATE TABLE IF NOT EXISTS publish_events (
  time TIMESTAMPTZ NOT NULL,
  skill_id UUID NOT NULL,
  version TEXT NOT NULL,
  user_id UUID NOT NULL,
  action TEXT NOT NULL  -- 'publish' | 'deprecate' | 'delete'
);
SELECT create_hypertable('publish_events', 'time', if_not_exists => TRUE);

-- ======================
-- Indexes
-- ======================
CREATE INDEX IF NOT EXISTS idx_skills_keywords ON skills USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);
CREATE INDEX IF NOT EXISTS idx_skill_versions_skill_id ON skill_versions(skill_id);
CREATE INDEX IF NOT EXISTS idx_api_tokens_user_id ON api_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_download_events_skill_id ON download_events(skill_id, time DESC);

-- Full text search (use trigger instead of generated column for array support)
CREATE INDEX IF NOT EXISTS idx_skills_name_desc ON skills USING GIN(
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
);

-- ======================
-- Seed: demo user
-- ======================
INSERT INTO users (id, username, email, password_hash) VALUES
  ('00000000-0000-0000-0000-000000000001', 'demo', 'demo@skillpkg.dev', '$2b$10$placeholder_hash_for_demo')
ON CONFLICT DO NOTHING;

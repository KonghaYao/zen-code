# SkillPkg — Skill Package Manager

> 类 npm/jsr 的 AI Skill 包管理系统，专为 Claude/LangGraph Skill 体系设计

---

## 概览

**项目代号**: skillpkg  
**定位**: 面向 AI Agent Skill 的开放注册中心，支持发布、版本控制、搜索、安装及锁文件管理  
**参考系统**: npm, jsr.io

---

## 技术栈

| 层级               | 技术                                           |
| ------------------ | ---------------------------------------------- |
| 后端 API           | Elysia + Bun                                   |
| 数据库             | TimescaleDB (PostgreSQL 超集)                  |
| 对象存储           | S3 兼容接口 (AWS S3 / R2 / MinIO / 阿里云 OSS) |
| 前端 (搜索/文档站) | React + Tailwind + Bun (类 zen-swarm 配置)     |
| CLI                | Bun runtime                                    |

---

## 认证与权限

| 方式             | 场景                                      |
| ---------------- | ----------------------------------------- |
| Email + Password | 用户注册/登录                             |
| GitHub OAuth     | 第三方快速登录                            |
| API Token        | CLI publish / 自动化流程                  |
| 公开只读         | 无需认证即可 install / search             |
| 私有包           | 需认证，按 scope 隔离 (`@org/skill-name`) |

---

## Skill 包格式

保持现有 SKILL.md 结构不变，新增 `skill.json` 作为包元信息文件：

```
my-skill/
├── skill.json          # 包元信息 (新增，类 package.json)
├── SKILL.md            # YAML frontmatter + Markdown 主体 (不变)
├── scripts/            # 可选：SKILL.md 中引用的脚本
│   └── helper.py
└── configs/            # 可选：引用的配置文件
    └── rules.json
```

### skill.json 结构

```json
{
    "name": "my-skill",
    "version": "1.0.0",
    "description": "What this skill does",
    "author": "username",
    "license": "MIT",
    "keywords": ["coding", "react"],
    "files": ["scripts/", "configs/"],
    "dependencies": {
        "other-skill": "^1.0.0"
    }
}
```

`files` 字段声明需要随包一起发布的文件夹或文件（相对路径），未声明的不打包。`SKILL.md` 和 `skill.json`
本身始终包含，无需声明。

### SKILL.md frontmatter (不变)

```yaml
---
name: 'my-skill'
description: 'Short description for matching'
---
```

### Publish 打包行为

`skill publish` 按 `skill.json` 中的 `files` 字段决定打包内容：

1. 读取 `skill.json` 的 `files` 列表
2. 将 `SKILL.md` + `skill.json` + `files` 声明的路径打包为 `.tar.gz`
3. 计算整体 SHA-512 integrity
4. 上传至 OSS

**安装时**：所有文件按原相对路径还原到 `.claude/skills/<name>/` 目录下

---

## 版本管理

- 遵循 **Semver** 标准 (MAJOR.MINOR.PATCH)
- 支持范围语法: `^1.0.0`, `~1.2.0`, `>=1.0.0`
- 支持标签: `latest`, `stable`, `next`
- 不可变版本: 已发布版本内容不可覆盖

---

## CLI 命令

```bash
# 安装
skill install <name>[@version]       # 安装到 .claude/skills/
skill install                        # 按 skills.lock 恢复

# 搜索
skill search <query>                 # 全文搜索注册中心

# 发布
skill init                           # 初始化 skill.json
skill publish                        # 发布当前目录的 skill
skill publish --tag next             # 发布到 next 标签

# 版本管理
skill update [name]                  # 更新 skill
skill outdated                       # 列出可更新项
skill remove <name>                  # 卸载本地 skill

# Lockfile
skill lock                           # 生成/刷新 skills.lock

# 认证
skill login                          # 登录 (browser or token)
skill logout
skill token create                   # 生成 API Token
```

### skills.lock 格式

```json
{
    "lockfileVersion": 1,
    "skills": {
        "codebase-exploration": {
            "version": "1.2.3",
            "resolved": "https://registry.skillpkg.dev/codebase-exploration/1.2.3.tar.gz",
            "integrity": "sha512-..."
        }
    }
}
```

---

## 后端 API 设计

### REST Endpoints

```
GET  /api/skills                     # 列表/搜索 (支持 q, tag, page)
GET  /api/skills/:name               # 包元信息
GET  /api/skills/:name/:version      # 指定版本信息
GET  /api/skills/:name/:version.tar.gz  # 下载包文件

POST /api/publish                    # 发布新版本 (需 Token)
DELETE /api/skills/:name/:version    # 撤回版本 (需 Token + 权限)

GET  /api/search?q=...               # 全文搜索
GET  /api/users/:username/skills     # 用户的所有包

POST /api/auth/register
POST /api/auth/login
POST /api/auth/token                 # 创建 API Token
GET  /api/auth/github                # GitHub OAuth
```

---

## 数据库设计 (TimescaleDB)

### 普通表 (Postgres)

```sql
-- 用户
CREATE TABLE users (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  github_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 包
CREATE TABLE skills (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES users(id),
  description TEXT,
  keywords TEXT[],
  is_private BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 版本
CREATE TABLE skill_versions (
  id UUID PRIMARY KEY,
  skill_id UUID REFERENCES skills(id),
  version TEXT NOT NULL,  -- semver
  tarball_url TEXT NOT NULL,
  integrity TEXT NOT NULL,  -- sha512
  skill_json JSONB,
  published_by UUID REFERENCES users(id),
  published_at TIMESTAMPTZ DEFAULT NOW(),
  deprecated BOOLEAN DEFAULT FALSE,
  UNIQUE(skill_id, version)
);

-- API Token
CREATE TABLE api_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  token_hash TEXT UNIQUE NOT NULL,
  name TEXT,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);
```

### TimescaleDB 超表 (时序数据)

```sql
-- 下载事件 (时序)
CREATE TABLE download_events (
  time TIMESTAMPTZ NOT NULL,
  skill_id UUID NOT NULL,
  version TEXT NOT NULL,
  user_id UUID,           -- NULL = 匿名
  ip_hash TEXT,           -- 隐私化
  cli_version TEXT,
  country_code TEXT
);
SELECT create_hypertable('download_events', 'time');

-- API 请求监控 (时序)
CREATE TABLE api_requests (
  time TIMESTAMPTZ NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INT NOT NULL,
  latency_ms INT NOT NULL,
  user_id UUID
);
SELECT create_hypertable('api_requests', 'time');

-- Publish 历史 (时序)
CREATE TABLE publish_events (
  time TIMESTAMPTZ NOT NULL,
  skill_id UUID NOT NULL,
  version TEXT NOT NULL,
  user_id UUID NOT NULL,
  action TEXT NOT NULL  -- 'publish' | 'deprecate' | 'delete'
);
SELECT create_hypertable('publish_events', 'time');
```

---

## OSS 存储结构

```
bucket/
└── skills/
    └── {skill-name}/
        └── {version}/
            ├── skill.tar.gz      # 包文件
            └── skill.json        # 元信息快照
```

- 上传时计算 SHA-512 integrity hash
- 使用 presigned URL 供客户端直接下载
- CDN 加速 (可选，前置 CloudFront / CF Workers)

---

## 前端 (搜索/文档站)

参考 jsr.io / npmjs.com 设计：

- **首页**: 搜索框 + 热门 Skill 展示
- **包页面**: README 渲染、版本列表、下载量图表 (TimescaleDB 数据)
- **用户页面**: 个人发布的包列表
- **安装指令**: 一键复制 `skill install xxx`

---

## 项目目录结构 (规划)

类 zen-swarm 风格：前后端合并为一个 `registry` 包，Elysia 同时 serve API 和静态前端资源。

```
skillpkg/
├── registry/                # Elysia 后端 + React 前端 (类 zen-swarm)
│   ├── src/
│   │   ├── server.ts        # Elysia 入口，挂载 API + 静态文件
│   │   ├── routes/          # API 路由
│   │   │   ├── skills.ts
│   │   │   ├── publish.ts
│   │   │   ├── search.ts
│   │   │   └── auth.ts
│   │   ├── db/              # TimescaleDB 查询层
│   │   │   ├── client.ts
│   │   │   ├── skills.ts
│   │   │   └── timeseries.ts
│   │   ├── storage/         # S3 兼容 OSS 封装
│   │   │   └── s3.ts
│   │   ├── auth/            # 认证逻辑 (Better Auth)
│   │   └── semver/          # 版本解析与匹配
│   ├── frontend/            # React + Tailwind 前端源码
│   │   ├── src/
│   │   │   ├── pages/       # 首页、包详情、用户页
│   │   │   ├── components/
│   │   │   └── main.tsx
│   │   └── vite.config.ts
│   └── package.json
├── cli/                     # skill CLI 工具
│   ├── src/
│   │   ├── index.ts         # 入口，命令注册
│   │   ├── commands/        # install, publish, search, remove...
│   │   ├── lockfile/        # skills.lock 读写
│   │   ├── resolver/        # semver 解析 + 依赖树
│   │   └── client/          # HTTP 客户端 (fetch registry API)
│   └── package.json
├── docker/
│   ├── docker-compose.yml   # TimescaleDB + MinIO dev env
│   └── init.sql             # 超表初始化 SQL
├── specs/
│   └── skillpkg-design.md   # 本文档
└── package.json             # monorepo root (Bun workspaces)
```

---

## 开发阶段规划

### Phase 1 — 核心注册中心 (MVP)

- [ ] TimescaleDB schema 初始化
- [ ] S3 兼容存储封装
- [ ] 基础 API: publish / install / search
- [ ] Semver 解析与版本匹配
- [ ] CLI: `skill install`, `skill publish`, `skill search`

### Phase 2 — 认证与权限

- [ ] Email + Password 注册登录
- [ ] GitHub OAuth
- [ ] API Token 管理
- [ ] 私有包访问控制

### Phase 3 — Lockfile & 依赖解析

- [ ] `skills.lock` 格式设计与实现
- [ ] 依赖树解析 (skill 依赖其他 skill)
- [ ] `skill install` (无参数，按 lockfile 恢复)
- [ ] Integrity 校验

### Phase 4 — 前端站点

- [ ] 搜索页面
- [ ] 包详情页 (README 渲染)
- [ ] 下载量图表 (TimescaleDB 聚合查询)
- [ ] 用户主页

### Phase 5 — 生产就绪

- [ ] CDN 配置
- [ ] Rate limiting
- [ ] 监控 Dashboard (基于 TimescaleDB api_requests)
- [ ] CI/CD

---

## 已确认决策

- [x] Web 前端与后端合并在 `registry/` 包中 (类 zen-swarm)
- [x] `@org/skill` Scope 包在 MVP 阶段支持
- [x] `skill remove` 命令包含在 CLI 中
- [ ] 注册中心域名/部署平台 (待定)

---

_文档版本: 2026-03-10_

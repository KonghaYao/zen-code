# Pnpm to Bun Monorepo Migration Plan

## Overview

将 code-graph 项目从 pnpm workspace 迁移到 bun workspace，统一工具链。

**状态**: ✅ 已完成（bun.lock 存在，pnpm-lock.yaml 已删除）

**Migration Date**: 2026-02-20 **Migration Type**: Aggressive (直接删除 pnpm 配置，全面切换)
**Motivation**: 统一工具链（bun 内置 test/run/bundle）

---

## Pre-Migration Checklist

- [x] 确认 bun 版本 >= 1.2.0 (支持 workspace 稳定版)
- [x] 确认所有依赖与 bun 兼容
- [x] 备份 `pnpm-lock.yaml` (以防回滚) - **已完成，已删除**
- [x] 通知团队成员迁移计划

---

## Migration Steps

### Phase 1: Core Configuration

#### 1.1 删除 pnpm 配置文件

```bash
rm pnpm-lock.yaml
rm pnpm-workspace.yaml
rm -rf node_modules
```

#### 1.2 更新根目录 package.json

**Before:**

```json
{
  "scripts": {
    "dev:all": "pnpm-run-all --parallel dev:server dev:web",
    "dev": "pnpm dev:server",
    "build": "pnpm -r --filter './packages/*' build && pnpm --filter zen-code build && pnpm --filter zen-worker build",
    "build:packages": "pnpm -r --filter './packages/*' build",
    "build:zen-code": "pnpm --filter zen-code build",
    "build:zen-worker": "pnpm --filter zen-worker build"
  },
  "pnpm": {
    "onlyBuiltDependencies": [...],
    "overrides": {...}
  }
}
```

**After:**

```json
{
    "workspaces": ["packages/*", "zen-code", "zen-swarm"],
    "scripts": {
        "dev:all": "bun run --filter '*' dev &",
        "dev": "bun run dev:server",
        "build": "bun run --filter './packages/*' build && bun run --filter zen-code build && bun run --filter zen-worker build",
        "build:packages": "bun run --filter './packages/*' build",
        "build:zen-code": "bun run --filter zen-code build",
        "build:zen-worker": "bun run --filter zen-worker build"
    }
}
```

**Changes:**

- Add `workspaces` field (bun native support)
- Replace `pnpm -r --filter` with `bun run --filter`
- Replace `pnpm --filter` with `bun run --filter`
- Remove `pnpm` specific config block
- Remove `pnpm-run-all` dependency (use bun native)

#### 1.3 Workspace Protocol Migration

**Before (pnpm style):**

```json
{
    "dependencies": {
        "@codegraph/config": "workspace:*"
    }
}
```

**After (bun style):**

```json
{
    "dependencies": {
        "@codegraph/config": "workspace:^"
    }
}
```

> Note: Bun supports both `workspace:*` and `workspace:^`, but `workspace:^` is preferred for version matching.

---

### Phase 2: Per-Package Updates

#### 2.1 packages/agent/package.json

```diff
{
  "dependencies": {
-   "@codegraph/config": "workspace:*",
+   "@codegraph/config": "workspace:^",
-   "@langgraph-js/standard-agent": "workspace:*"
+   "@langgraph-js/standard-agent": "workspace:^"
  }
}
```

#### 2.2 zen-code/package.json

```diff
{
- "packageManager": "pnpm@10.6.2",
  "scripts": {
-   "prepublish": "pnpm build"
+   "prepublish": "bun run build"
  },
  "dependencies": {
-   "@codegraph/agent": "workspace:*",
+   "@codegraph/agent": "workspace:^",
-   "@codegraph/config": "workspace:*",
+   "@codegraph/config": "workspace:^",
-   "@codegraph/union-client": "workspace:*",
+   "@codegraph/union-client": "workspace:^",
-   "ink-pro": "workspace:*"
+   "ink-pro": "workspace:^"
  }
}
```

---

### Phase 3: Dependency Installation

```bash
# Install all dependencies with bun
bun install
```

Bun will:

1. Read `workspaces` from root package.json
2. Create `bun.lockb` (binary lockfile)
3. Hoist dependencies appropriately
4. Link workspace packages

---

### Phase 4: Script Verification

#### 4.1 Test all scripts

```bash
# Test build
bun run build

# Test dev server
bun run dev:server

# Test TUI
bun run dev:tui

# Test all dev processes
bun run dev:all
```

#### 4.2 Known pnpm → bun command mappings

| pnpm                                 | bun                                  |
| ------------------------------------ | ------------------------------------ |
| `pnpm add <pkg>`                     | `bun add <pkg>`                      |
| `pnpm add -D <pkg>`                  | `bun add -d <pkg>`                   |
| `pnpm -r --filter '<pattern>' <cmd>` | `bun run --filter '<pattern>' <cmd>` |
| `pnpm --filter <pkg> <cmd>`          | `bun run --filter <pkg> <cmd>`       |
| `pnpm exec <cmd>`                    | `bunx <cmd>`                         |
| `pnpm test`                          | `bun test`                           |
| `pnpm run <script>`                  | `bun run <script>`                   |

---

### Phase 5: CI/CD Updates

#### 5.1 GitHub Actions

**Before:**

```yaml
- uses: pnpm/action-setup@v2
  with:
      version: 10
- run: pnpm install
- run: pnpm build
```

**After:**

```yaml
- uses: oven-sh/setup-bun@v1
  with:
      bun-version: latest
- run: bun install
- run: bun run build
```

---

### Phase 6: Documentation Updates

#### 6.1 Files to update

- [ ] `README.md` (if exists)
- [ ] `CLAUDE.md` - Update all pnpm commands
- [ ] `AGENTS.md` - Update all pnpm commands
- [ ] `specs/*.md` - Update any pnpm references
- [ ] `packages/*/README.md` - Update installation instructions

#### 6.2 Search and replace patterns

```
pnpm build     → bun run build
pnpm install   → bun install
pnpm add       → bun add
pnpm test      → bun test
pnpm dev       → bun run dev
```

---

## Post-Migration Verification

### Functional Tests

- [ ] `bun install` completes without errors
- [ ] `bun run build` builds all packages
- [ ] `bun run dev:server` starts LangGraph server
- [ ] `bun run dev:tui` launches TUI application
- [ ] `bun test` runs all tests
- [ ] All workspace dependencies resolve correctly

### Performance Comparison

| Metric         | pnpm | bun | Improvement |
| -------------- | ---- | --- | ----------- |
| `install` time | TBD  | TBD | -           |
| `build` time   | TBD  | TBD | -           |
| Lockfile size  | TBD  | TBD | -           |

---

## Rollback Plan (if needed)

```bash
# Restore pnpm configuration
git checkout pnpm-lock.yaml pnpm-workspace.yaml

# Clean bun artifacts
rm bun.lockb
rm -rf node_modules

# Reinstall with pnpm
pnpm install
```

---

## Risks and Mitigations

| Risk                       | Likelihood | Mitigation                             |
| -------------------------- | ---------- | -------------------------------------- |
| Dependency incompatibility | Low        | Test all packages after migration      |
| Native module issues       | Medium     | Check `onlyBuiltDependencies` packages |
| CI/CD pipeline breakage    | Low        | Update GitHub Actions simultaneously   |
| Team unfamiliarity         | Low        | Provide command mapping guide          |

---

## Timeline

| Phase                    | Duration    | Status  |
| ------------------------ | ----------- | ------- |
| Phase 1: Core Config     | 5 min       | Pending |
| Phase 2: Package Updates | 10 min      | Pending |
| Phase 3: Install         | 2 min       | Pending |
| Phase 4: Verification    | 10 min      | Pending |
| Phase 5: CI/CD           | 5 min       | Pending |
| Phase 6: Documentation   | 10 min      | Pending |
| **Total**                | **~45 min** | -       |

---

## References

- [Bun Workspaces Documentation](https://bun.sh/docs/install/workspaces)
- [Bun vs pnpm Command Comparison](https://bun.sh/docs/cli/install)
- [Migration Guide from pnpm](https://bun.sh/docs/cli/install#migrating-from-pnpm)

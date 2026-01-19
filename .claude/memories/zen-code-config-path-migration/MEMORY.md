---
name: "zen-code-config-path-migration"
description: "zen-code 配置文件路径从 ~/.code-graph.json 迁移到 ~/.zen-code/settings.json；修改 tui/src/chat/store/index.ts 中的 dbPath 定义，添加 zenConfigDir 变量指向新路径，同时更新相关文件和 GitHub Action workflow；适用于 zen-code 项目的配置管理架构"
tags: ["zen-code", "config", "lowdb", "file-system", "architecture"]
category: "architecture"
created: "2025-01-18"
last_updated: "2025-01-18"
priority: "high"
context_scope: "project"
---

# ## 背景

## 背景

zen-code 项目需要统一配置文件路径，从 `~/.code-graph.json` 迁移到更规范的 `~/.zen-code/settings.json`。

## 决策

将配置文件从用户主目录直接放置，改为使用专用配置目录：

- **旧路径**：`~/.code-graph.json`
- **新路径**：`~/.zen-code/settings.json`

## 原因

1. **更好的组织性**：使用专用目录 `~/.zen-code` 存放所有 zen-code 相关配置
2. **可扩展性**：未来可以在同一目录下添加其他配置文件
3. **规范化**：遵循 Unix 配置管理最佳实践

## 实现

**核心修改**（`tui/src/chat/store/index.ts:28-31`）：

```typescript
// 将配置文件存储到用户目录
const userHome = os.homedir();
const zenConfigDir = path.join(userHome, '.zen-code');
export const dbPath = path.join(zenConfigDir, 'settings.json');
```

**相关文件修改**：

1. **tui/src/nonInteractive.ts:36**：注释更新
   ```typescript
   // 初始化配置（读取 ~/.zen-code/settings.json）
   ```

2. **.github/workflows/auto-fix-issues.yml**：GitHub Action 配置文件创建
   ```bash
   mkdir -p ~/.zen-code
   cat > ~/.zen-code/settings.json << 'EOF'
   {
     "main_model": "claude-sonnet-4-20250514",
     "model_provider": "anthropic",
     "anthropic_api_key": "${{ secrets.ANTHROPIC_API_KEY }}",
     "enable_thinking": true
   }
   EOF
   ```

3. **AGENTS.md:44**：文档更新
4. **agents/code/subagents/config.ts:31**：注释更新

**配置文件结构**：

```json
{
  "main_model": "claude-sonnet-4-20250514",
  "model_provider": "anthropic",
  "anthropic_api_key": "sk-ant-...",
  "openai_api_key": "...",  // 可选
  "enable_thinking": true
}
```

## 待完成

用户提醒需要在 `tui/src/chat/store/index.ts` 的 `initDb` 函数中添加目录不存在时的错误处理：

```typescript
export const initDb = async () => {
    await db.read();
    
    // 需要添加：确保配置目录存在
    if (!fs.existsSync(zenConfigDir)) {
        fs.mkdirSync(zenConfigDir, { recursive: true });
    }
    
    if (!db.data || !db.data.config) {
        db.data = defaultData;
        await db.write();
    }
    
    syncEnvFromConfig();
};
```

## 适用场景

- zen-code 项目的配置管理
- 需要规范配置文件路径的 CLI 工具

## 注意事项

1. **迁移策略**：需要考虑已有用户如何迁移旧配置
2. **目录创建**：`initDb` 函数需要确保目录存在
3. **权限问题**：注意用户主目录的写入权限
4. **跨平台**：使用 `os.homedir()` 和 `path.join` 确保跨平台兼容

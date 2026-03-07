# INDEX.md 模板

```markdown
# .codebase 索引

## 项目概览

[2-4 句话描述项目。必须覆盖所有客户端/入口，不能只提其中一个。例如：同时有 TUI 和 Web UI 的项目需要两个都描述。]

## 架构分层

[如果项目有分层架构，在此列出。示例：]
```

Framework → packages/standard-agent/, packages/agent-middlewares/ Application → packages/agent/, packages/config/ Client
→ zen-code/, zen-swarm/

```

[没有明显分层则省略此节。]

## 模块索引

| 模块 | 文档 | 层级 | 职责 |
|------|------|------|------|
| [模块名] | [链接] | Framework/Application/Client | [一句话职责] |

## 场景检索表

> 当你要完成某个任务时，直接查对应的文档位置，不要从头扫描源码。

| 任务场景 | 查阅位置 |
|----------|----------|
| [场景描述，如"新增中间件"] | [模块文档#章节，如 standard-agent.md → middlewares/] |
| [场景描述] | [模块文档#章节] |

[至少填写 5-8 个高频场景。]
```

---
title: 配置管理
---

# 配置管理

## 配置存在哪里

你的配置在 `~/.zen-code/settings.json` 这个文件里。这是一个 JSON 文件，你可以直接编辑它，也可以通过 Zen
Code 的设置面板来改。

如果你在一个项目里想用不同的配置，可以在项目根目录创建 `.zen-code/config.json`。项目配置会覆盖用户配置。

## 你想添加一个新的 API 提供商

比如说，你已经配置了 OpenAI，现在想加 Anthropic。

输入 `/provider` 打开提供商面板，选择添加新提供商。填上：

- 名称（比如 "Anthropic"）
- API Key
- 如果有自定义的 Base URL，也填上

保存后，你就可以在这两个提供商之间切换了。

## 配置文件长什么样

大概是这样：

```json
{
    "provider_id": "openai",
    "model_id": "gpt-4o",
    "providers": [
        {
            "id": "openai",
            "name": "OpenAI",
            "api_key": "sk-..."
        },
        {
            "id": "anthropic",
            "name": "Anthropic",
            "api_key": "sk-ant-..."
        }
    ]
}
```

`provider_id` 决定当前用哪个提供商，`model_id` 是默认模型。

## 什么是 YOLO 模式

YOLO 模式会让 AI 跳过所有人工确认。文件写入、命令执行，全部自动进行。

开启方法：

```bash
export YOLO_MODE=true
```

只有在你完全信任 AI、或者在一个沙盒环境里才建议这么干。状态栏会显示红色的 "YOLO" 提醒你。

## 你想配置 MCP 服务器

MCP 让 AI 能用额外的工具。在配置文件里加一个 `mcp_config`：

```json
{
    "mcp_config": {
        "mcpServers": {
            "filesystem": {
                "command": "npx",
                "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/projects"]
            }
        }
    }
}
```

这样 AI 就能访问指定目录的文件了。

## 设置面板怎么用

输入 `/settings` 打开。

这是个简单的表单：

- `↑` `↓` 选择项目
- `←` `→` 修改值（对于选项类型）
- `Enter` 进入编辑（对于输入类型）
- 改完不用刻意保存，自动就存了

## 配置出问题了怎么办

启动时 Zen Code 会检查配置是否有效。如果 API Key 不对或者连不上服务器，会弹出配置向导让你重新填。

你也可以手动触发：把配置文件删了，或者把 API Key 清空，然后重新启动。

## 几个建议

1. **定期备份配置文件** - 虽然不算大，但重新配置也挺烦的
2. **项目配置只放项目特定的东西** - 比如这个项目要用特定的模型

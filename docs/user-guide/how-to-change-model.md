---
title: 如何配置模型
---

# 如何配置模型

> 1. `/model` 打开模型面板
> 2. 切换 Provider 标签
> 3. 新增 Provider
> 4. 返回模型, 等待查询出模型
> 5. 选择模型

## 第一次使用

启动时向导会引导你配置 Provider，选 OpenAI 或 Anthropic，填 API Key 就能用。

## 添加更多 Provider

输入 `/provider` 打开面板。

添加新 Provider：按 `n`，填 ID、类型、API Key、Base URL（可选）。

删除 Provider：选中后按 `d`，但不能删最后一个。

可以同时配置多个 Provider。

**常用配置示例：**

OpenAI 类型的接口：

- ID: `openai`
- 类型: `openai`
- Base URL: `https://api.openai.com/v1` (一般是有 /v1 的)

Anthropic 类型的接口：

- ID: `anthropic`
- 类型: `anthropic`
- Base URL: `https://open.bigmodel.cn/api/anthropic`

## 切换模型

先选 Provider，再选模型。

输入 `/model` 打开模型面板。

顶部是 Provider 标签，左右箭头切换到你想要的 Provider。

下面是当前 Provider 的模型列表，上下键选中，按 `Enter` 确认。

## 自定义 API 端点

OpenAI 兼容的 API 在 Provider 配置里填 `baseUrl`，比如国内代理或私有部署。

## 查看当前配置

状态栏显示当前 Provider 和模型。

## 切换模型会丢对话吗

不会。对话历史和模型是独立的。

但要注意：换到上下文窗口小的模型，长对话可能被截断。

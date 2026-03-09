# @langgraph-js/web-fetch

网页内容提取与解析库，支持将 HTML 转换为 Markdown，内置多平台专用清理器。

## 特性

- **多 URL 并行处理** — 批量抓取，自动并发
- **智能内容提取** — 基于 Mozilla Readability / Defuddle，自动过滤导航、广告等噪音
- **多平台适配** — 内置飞书、Docker Hub、InfoQ、微信公众号等专用清理器
- **格式转换** — HTML → Markdown，支持代码块、表格、标题等结构保留
- **元数据提取** — title、description、Open Graph、Twitter Card，可输出为 YAML frontmatter
- **字符集自动检测** — 支持 GBK / GB2312 / UTF-8 等编码自动转换
- **Cookie 管理** — 内置 fetch-cookie，支持跨重定向会话（飞书 SSO 等场景）
- **浏览器 UA 伪装** — 模拟 Chrome 请求头，降低被拦截概率

## 安装

```bash
bun add @langgraph-js/web-fetch
# 或
npm install @langgraph-js/web-fetch
```

## 快速上手

```typescript
import { webFetch } from '@langgraph-js/web-fetch';

const result = await webFetch({
    urls: ['https://example.com'],
    format: 'markdown',
});

console.log(result.results[0].raw_content);
```

## API

### `webFetch(params)`

主入口，批量抓取并提取网页内容。

```typescript
const response = await webFetch({
    urls: ['https://example.com', 'https://docs.example.com'],
    format: 'markdown', // 'markdown' | 'text'，默认 'markdown'
    extract_depth: 'advanced', // 'basic' | 'advanced'，默认 'basic'
    include_images: true, // 是否提取图片链接，默认 false
    include_favicon: false, // 是否提取 favicon，默认 false
    timeout: 30, // 超时秒数（1–60），默认 30
});

// response.results        — 成功结果列表
// response.failed_results — 失败结果列表
// response.response_time  — 总耗时（ms）
// response.request_id     — 请求唯一 ID
```

#### 返回类型

```typescript
interface ExtractResult {
    url: string;
    raw_content: string; // Markdown 或纯文本内容（含 YAML frontmatter）
    images?: string[]; // 页面图片 URL 列表
    favicon?: string; // 网站图标 URL
}

interface ExtractResponse {
    results: ExtractResult[];
    failed_results: FailedResult[];
    response_time: number;
    request_id: string;
}
```

### `extractReadableContent(html, url, options?)`

从 HTML 字符串提取可读内容，返回包含 `content`（HTML）和 `metadata` 的对象。

### `getHTMLContent(url, options?)`

获取 URL 的原始 HTML，自动处理字符集检测与解码，过滤 PDF 等二进制响应。

### `HTMLToMarkdown(html)`

将 HTML 字符串转换为 Markdown（ATX 标题 + 围栏代码块）。

### `getMetaData(document)` / `metaDataToYaml(metadata)`

从 DOM 文档提取元数据，或将元数据序列化为 YAML frontmatter 字符串。

## 清理器

内容提取通过清理器（Cleaner）系统完成，根据 URL 自动匹配：

| 清理器             | 适用场景                |
| ------------------ | ----------------------- |
| `ReadableCleaner`  | 通用网页（默认）        |
| `FeishuCleaner`    | 飞书 / Larksuite 文档   |
| `DockerHubCleaner` | Docker Hub 仓库页       |
| `InfoQCleaner`     | InfoQ 文章              |
| `NoCleaner`        | 跳过清理，返回原始 HTML |

### 自定义清理器

继承 `HTMLCleaner` 实现自定义逻辑：

```typescript
import { HTMLCleaner } from '@langgraph-js/web-fetch';

class MyCustomCleaner extends HTMLCleaner {
    isMatch(url: string) {
        return url.includes('my-site.com');
    }

    async getCleanContent(document: Document) {
        const main = document.querySelector('article');
        return { content: main?.innerHTML ?? '', metadata: {} };
    }
}
```

## CLI 工具

本包提供命令行工具 `web-fetch`，用于快速抓取网页内容。

### 安装

```bash
bun add @langgraph-js/web-fetch
# 或全局安装
npm install -g @langgraph-js/web-fetch
```

### 使用

```bash
# 基本用法
web-fetch https://example.com

# 多个 URL
web-fetch https://example.com https://docs.example.com

# 输出为纯文本
web-fetch https://example.com --format text

# 高级提取模式
web-fetch https://example.com --extract-depth advanced

# 包含图片链接
web-fetch https://example.com --include-images

# 设置超时时间
web-fetch https://example.com --timeout 30

# 完整示例
web-fetch https://example.com \
  --format markdown \
  --extract-depth advanced \
  --include-images \
  --timeout 30
```

### 选项

| 选项                | 类型    | 默认值   | 描述                        |
| ------------------- | ------- | -------- | --------------------------- |
| `--format`          | string  | markdown | 输出格式：markdown 或 text  |
| `--extract-depth`   | string  | basic    | 提取深度：basic 或 advanced |
| `--include-images`  | boolean | false    | 是否提取图片链接            |
| `--include-favicon` | boolean | false    | 是否提取 favicon            |
| `--timeout`         | number  | 10       | 超时秒数（1-60）            |

## 依赖

| 依赖                             | 用途                 |
| -------------------------------- | -------------------- |
| `@mozilla/readability`           | 主要内容提取算法     |
| `defuddle`                       | 备用内容解析器       |
| `turndown`                       | HTML → Markdown 转换 |
| `happy-dom` / `@b-fuze/deno-dom` | 服务端 DOM 解析      |
| `iconv-lite`                     | 字符集编码转换       |
| `fetch-cookie` + `tough-cookie`  | Cookie 管理          |
| `zod`                            | 参数验证             |

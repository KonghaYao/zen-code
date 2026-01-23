import { registerGraph } from '@langgraph-js/pure-graph';
import app from '@langgraph-js/pure-graph/dist/adapter/hono';
import { graph } from './graph';
import { createConfigServer } from '@codegraph/config';

// 注册 LangGraph
registerGraph('code', graph);

// 集成 ConfigServer
const configServer = await createConfigServer();

// 将 ConfigServer 的路由挂载到 /api 前缀
app.use('/api/*', async (c) => {
  // 构建 Request 对象
  const url = c.req.url;
  const method = c.req.method;
  const headers = new Headers();

  // 复制 Hono headers 到 Fetch API headers
  c.req.header().forEach((value, key) => {
    headers.set(key, value);
  });

  // 获取 body（如果有）
  let body: BodyInit | null = null;
  if (method !== 'GET' && method !== 'HEAD') {
    body = c.req.raw.body;
  }

  const request = new Request(url, {
    method,
    headers,
    body,
  });

  const response = await configServer.fetch(request);

  // 转换 Response 到 Hono 格式
  response.headers.forEach((value, key) => {
    c.header(key, value);
  });

  return c.body(response.body, response.status as any);
});

export default {
    fetch: app.fetch,
    port: 8123,
};

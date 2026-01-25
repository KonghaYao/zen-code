/**
 * Code-Graph Server
 * 使用新的 @codegraph/agent 包
 */

import { graph } from './graphBuilder.js';
import LGApp from '@langgraph-js/pure-graph/dist/adapter/hono';
import { createConfigServer } from '@codegraph/config';
import { createModelsRouter } from './server/models.js';
import { logger } from 'hono/logger';

// 注册 graph（使用新的包）
import { registerGraph } from '@langgraph-js/pure-graph';
import { Hono } from 'hono';
registerGraph('code', graph);

const app = new Hono()

// 日志中间件
app.use(logger());

// ConfigServer 中间件（通过前缀判断）
app.use('/api/*', async (c, next) => {
  const path = c.req.path;
  // ConfigServer 路由前缀
  if (path.startsWith('/api/config') ||
    path.startsWith('/api/skills') ||
    path.startsWith('/api/plugins') ||
    path.startsWith('/api/plugin') ||
    path.startsWith('/api/health')) {
    const response = await createConfigServer().then(server => server.fetch(c.req.raw));
    return c.newResponse(response.body, response);
  }

  await next();
});

// 挂载 Models 路由
app.route('/api/models', createModelsRouter());
app.route("/api/langgraph", LGApp)

export default {
  fetch: app.fetch,
  port: 8123,
};

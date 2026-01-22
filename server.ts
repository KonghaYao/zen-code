/**
 * Code-Graph Server
 * 使用新的 @codegraph/agent 包
 */

import { graph } from './packages/agent/src/graphBuilder.js';
import app from '@langgraph-js/pure-graph/dist/adapter/hono';

// 注册 graph（使用新的包）
import { registerGraph } from '@langgraph-js/pure-graph';
registerGraph('code', graph);

// 导出 Hono app
export default {
  fetch: app.fetch,
  port: 8123,
};

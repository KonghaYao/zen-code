/**
 * LangGraph 路由挂载
 * 将 @codegraph/agent 的 graph 注册到 /api/langgraph
 */

import { registerGraph } from '@langgraph-js/pure-graph';
import { graph } from '@codegraph/agent/src/graphBuilder.js';

export async function registerLangGraphRoutes() {
    registerGraph('code', graph);
    console.log('LangGraph graph "code" registered at /api/langgraph');
}

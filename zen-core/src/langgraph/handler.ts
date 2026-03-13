/**
 * LangGraph 路由挂载
 * 将 @codegraph/agent 的 graph 注册到 /api/langgraph
 */

import { registerGraph } from '@langgraph-js/pure-graph';
import { createCodeGraph } from '@codegraph/agent/src/graphBuilder.js';
import type { AgentPackage } from '@langgraph-js/standard-agent';

export async function registerLangGraphRoutes(agentPackage: AgentPackage) {
    const graph = createCodeGraph(agentPackage);
    registerGraph('code', graph);
    console.log('LangGraph graph "code" registered at /api/langgraph');
}

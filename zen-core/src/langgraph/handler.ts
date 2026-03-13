/**
 * LangGraph 路由挂载
 * 将 @codegraph/agent 的 graph 注册到 /api/langgraph
 */

import { registerGraph } from '@langgraph-js/pure-graph';
import { createCodeGraph } from '@codegraph/agent/src/graphBuilder.js';
import { DbProviderResolver } from './providerResolver.js';
import type { ZenCoreServices } from '../bootstrap.js';

export async function registerLangGraphRoutes(services: ZenCoreServices) {
    const providerResolver = new DbProviderResolver(services.providerStorage, services.agentPackage);
    const graph = createCodeGraph(services.agentPackage, { providerResolver });
    registerGraph('code', graph);
    console.log('LangGraph graph "code" registered at /api/langgraph');
}

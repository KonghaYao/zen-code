import { registerGraph } from '@langgraph-js/pure-graph';
import { graph } from './graphBuilder.js';
import { handleRequest } from '@langgraph-js/pure-graph/dist/adapter/fetch/index.js';
import { downloadRipGrep } from './utils/ripgrep.js';

await downloadRipGrep();
registerGraph('code', graph as any);

/**
 * LangGraph Fetch Handler
 * Used by zen-code to communicate with the agent backend
 */
export const LangGraphFetch = (url: string, init: RequestInit = {}) => {
    return handleRequest(new Request(url, init), {});
};

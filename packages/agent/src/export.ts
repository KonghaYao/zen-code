import { registerGraph } from '@langgraph-js/pure-graph';
import { graph } from './graphBuilder.js';
import { handleRequest } from '@langgraph-js/pure-graph/dist/adapter/fetch';
import { downloadRipGrep } from './utils/ripgrep.js';

await downloadRipGrep()
registerGraph('code', graph);
export const LangGraphFetch = (url: string, init: RequestInit = {}) => {
    return handleRequest(new Request(url, init), {});
};

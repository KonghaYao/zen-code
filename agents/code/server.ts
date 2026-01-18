import { registerGraph } from '@langgraph-js/pure-graph';
import app from '@langgraph-js/pure-graph/dist/adapter/hono';
import { graph } from './graph';
registerGraph('code', graph);

export default {
    fetch: app.fetch,
    port: 8123,
};

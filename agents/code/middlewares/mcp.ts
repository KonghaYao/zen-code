import { createMiddleware } from 'langchain';
import { ClientConfig, MultiServerMCPClient } from '@langchain/mcp-adapters';

export async function MCPMiddleware(options?: ClientConfig['mcpServers']) {
    if (!options || Object.keys(options).length === 0) {
        return createMiddleware({
            name: 'MCPSMiddleware',
        });
    }
    const client = new MultiServerMCPClient({
        throwOnLoadError: true,
        prefixToolNameWithServerName: false,
        additionalToolNamePrefix: '',
        useStandardContentBlocks: true,
        onConnectionError: 'ignore',
        mcpServers: options,
    });
    return createMiddleware({
        name: 'MCPSMiddleware',
        stateSchema: undefined,
        tools: await client.getTools(),
        afterAgent() {
            client.close();
        },
    });
}

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, Tool } from '@modelcontextprotocol/sdk/types.js';
import { webFetchTool } from './tools/webFetch.js';

export class MCPServer {
    private server: Server;
    private config: Record<string, any>;

    constructor(config: Record<string, any> = {}) {
        this.server = new Server(
            {
                name: '@langgraph-js/web-fetch',
                version: '1.0.0',
            },
            {
                capabilities: {
                    tools: {},
                },
            },
        );
        this.config = config;
        this.setupTools();
    }

    private setupTools() {
        // List available tools
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [webFetchTool.definition],
            };
        });

        // Handle tool calls
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            if (name === 'webFetch') {
                return webFetchTool.handler(args);
            }

            throw new Error(`Unknown tool: ${name}`);
        });
    }

    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
    }
}

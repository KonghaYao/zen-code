import { Server } from "https://esm.run/@modelcontextprotocol/sdk/server";
import { CallToolRequestSchema, ListToolsRequestSchema } from "https://esm.run/@modelcontextprotocol/sdk/types.js";
import { McpError, ErrorCode } from "https://esm.run/@modelcontextprotocol/sdk/types.js";
import { Hono } from "https://esm.run/hono";
import { cors } from "https://esm.run/hono/cors";
import { SSEServerTransport } from "https://denopkg.com/konghayao/zen-code/packages/tavily-deno/src/sse.ts";

const API_KEY = Deno.env.get("TAVILY_API_KEY");
const HOST = Deno.env.get("TAVILY_HOST") || "https://api.tavily.com";
const PORT = parseInt(Deno.env.get("PORT") || "3000");

class TavilyClient {
    server: Server;
    baseURLs = {
        search: HOST + '/search',
        extract: HOST + '/extract',
        crawl: HOST + '/crawl',
        map: HOST + '/map'
    };
    // Store active transports by sessionId
    private activeTransports = new Map<string, SSEServerTransport>();

    constructor() {
        this.server = new Server({
            name: "tavily-mcp",
            version: "0.2.10",
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupHandlers();
        this.setupErrorHandling();
    }

    setupErrorHandling() {
        this.server.onerror = (error) => {
            console.error("[MCP Error]", error);
        };
        Deno.addSignalListener("SIGINT", async () => {
            await this.server.close();
            Deno.exit(0);
        });
    }

    getDefaultParameters() {
        try {
            const parametersEnv = Deno.env.get("DEFAULT_PARAMETERS");
            if (!parametersEnv) {
                return {};
            }
            const defaults = JSON.parse(parametersEnv);
            if (typeof defaults !== 'object' || defaults === null || Array.isArray(defaults)) {
                console.warn(`DEFAULT_PARAMETERS is not a valid JSON object: ${parametersEnv}`);
                return {};
            }
            return defaults;
        }
        catch (error) {
            console.warn(`Failed to parse DEFAULT_PARAMETERS as JSON: ${error.message}`);
            return {};
        }
    }

    setupHandlers() {
        this.setupToolHandlers();
    }

    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            const tools = [
                {
                    name: "tavily_search",
                    description: "A powerful web search tool that provides comprehensive, real-time results using Tavily's AI search engine. Returns relevant web content with customizable parameters for result count, content type, and domain filtering. Ideal for gathering current information, news, and detailed web content analysis.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            query: {
                                type: "string",
                                description: "Search query"
                            },
                            search_depth: {
                                type: "string",
                                enum: ["basic", "advanced", "fast", "ultra-fast"],
                                description: "The depth of the search. 'basic' for generic results, 'advanced' for more thorough search, 'fast' for optimized low latency with high relevance, 'ultra-fast' for prioritizing latency above all else",
                                default: "basic"
                            },
                            topic: {
                                type: "string",
                                enum: ["general", "news"],
                                description: "The category of the search. This will determine which of our agents will be used for the search",
                                default: "general"
                            },
                            days: {
                                type: "number",
                                description: "The number of days back from the current date to include in the search results. This specifies the time frame of data to be retrieved. Please note that this feature is only available when using the 'news' search topic",
                                default: 3
                            },
                            time_range: {
                                type: "string",
                                description: "The time range back from the current date to include in the search results. This feature is available for both 'general' and 'news' search topics",
                                enum: ["day", "week", "month", "year", "d", "w", "m", "y"],
                            },
                            start_date: {
                                type: "string",
                                description: "Will return all results after the specified start date. Required to be written in the format YYYY-MM-DD.",
                                default: "",
                            },
                            end_date: {
                                type: "string",
                                description: "Will return all results before the specified end date. Required to be written in the format YYYY-MM-DD",
                                default: "",
                            },
                            max_results: {
                                type: "number",
                                description: "The maximum number of search results to return",
                                default: 10,
                                minimum: 5,
                                maximum: 20
                            },
                            include_images: {
                                type: "boolean",
                                description: "Include a list of query-related images in the response",
                                default: false,
                            },
                            include_image_descriptions: {
                                type: "boolean",
                                description: "Include a list of query-related images and their descriptions in the response",
                                default: false,
                            },
                            include_raw_content: {
                                type: "boolean",
                                description: "Include the cleaned and parsed HTML content of each search result",
                                default: false,
                            },
                            include_domains: {
                                type: "array",
                                items: { type: "string" },
                                description: "A list of domains to specifically include in the search results, if the user asks to search on specific sites set this to the domain of the site",
                                default: []
                            },
                            exclude_domains: {
                                type: "array",
                                items: { type: "string" },
                                description: "List of domains to specifically exclude, if the user asks to exclude a domain set this to the domain of the site",
                                default: []
                            },
                            country: {
                                type: "string",
                                enum: ['afghanistan', 'albania', 'algeria', 'andorra', 'angola', 'argentina', 'armenia', 'australia', 'austria', 'azerbaijan', 'bahamas', 'bahrain', 'bangladesh', 'barbados', 'belarus', 'belgium', 'belize', 'benin', 'bhutan', 'bolivia', 'bosnia and herzegovina', 'botswana', 'brazil', 'brunei', 'bulgaria', 'burkina faso', 'burundi', 'cambodia', 'cameroon', 'canada', 'cape verde', 'central african republic', 'chad', 'chile', 'china', 'colombia', 'comoros', 'congo', 'costa rica', 'croatia', 'cuba', 'cyprus', 'czech republic', 'denmark', 'djibouti', 'dominican republic', 'ecuador', 'egypt', 'el salvador', 'equatorial guinea', 'eritrea', 'estonia', 'ethiopia', 'fiji', 'finland', 'france', 'gabon', 'gambia', 'georgia', 'germany', 'ghana', 'greece', 'guatemala', 'guinea', 'haiti', 'honduras', 'hungary', 'iceland', 'india', 'indonesia', 'iran', 'iraq', 'ireland', 'israel', 'italy', 'jamaica', 'japan', 'jordan', 'kazakhstan', 'kenya', 'kuwait', 'kyrgyzstan', 'latvia', 'lebanon', 'lesotho', 'liberia', 'libya', 'liechtenstein', 'lithuania', 'luxembourg', 'madagascar', 'malawi', 'malaysia', 'maldives', 'mali', 'malta', 'mauritania', 'mauritius', 'mexico', 'moldova', 'monaco', 'mongolia', 'montenegro', 'morocco', 'mozambique', 'myanmar', 'namibia', 'nepal', 'netherlands', 'new zealand', 'nicaragua', 'niger', 'nigeria', 'north korea', 'north macedonia', 'norway', 'oman', 'pakistan', 'panama', 'papua new guinea', 'paraguay', 'peru', 'philippines', 'poland', 'portugal', 'qatar', 'romania', 'russia', 'rwanda', 'saudi arabia', 'senegal', 'serbia', 'singapore', 'slovakia', 'slovenia', 'somalia', 'south africa', 'south korea', 'south sudan', 'spain', 'sri lanka', 'sudan', 'sweden', 'switzerland', 'syria', 'taiwan', 'tajikistan', 'tanzania', 'thailand', 'togo', 'trinidad and tobago', 'tunisia', 'turkey', 'turkmenistan', 'uganda', 'ukraine', 'united arab emirates', 'united kingdom', 'united states', 'uruguay', 'uzbekistan', 'venezuela', 'vietnam', 'yemen', 'zambia', 'zimbabwe'],
                                description: "Boost search results from a specific country. This will prioritize content from the selected country in the search results. Available only if topic is general. Country names MUST be written in lowercase, plain English, with spaces and no underscores.",
                                default: ""
                            },
                            include_favicon: {
                                type: "boolean",
                                description: "Whether to include the favicon URL for each result",
                                default: false,
                            }
                        },
                        required: ["query"]
                    }
                },
                {
                    name: "tavily_extract",
                    description: "A powerful web content extraction tool that retrieves and processes raw content from specified URLs, ideal for data collection, content analysis, and research tasks.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            urls: {
                                type: "array",
                                items: { type: "string" },
                                description: "List of URLs to extract content from"
                            },
                            extract_depth: {
                                type: "string",
                                enum: ["basic", "advanced"],
                                description: "Depth of extraction - 'basic' or 'advanced', if usrls are linkedin use 'advanced' or if explicitly told to use advanced",
                                default: "basic"
                            },
                            include_images: {
                                type: "boolean",
                                description: "Include a list of images extracted from the urls in the response",
                                default: false,
                            },
                            format: {
                                type: "string",
                                enum: ["markdown", "text"],
                                description: "The format of the extracted web page content. markdown returns content in markdown format. text returns plain text and may increase latency.",
                                default: "markdown"
                            },
                            include_favicon: {
                                type: "boolean",
                                description: "Whether to include the favicon URL for each result",
                                default: false,
                            },
                            query: {
                                type: "string",
                                description: "User intent query for reranking extracted chunks based on relevance"
                            },
                        },
                        required: ["urls"]
                    }
                },
                {
                    name: "tavily_crawl",
                    description: "A powerful web crawler that initiates a structured web crawl starting from a specified base URL. The crawler expands from that point like a graph, following internal links across pages. You can control how deep and wide it goes, and guide it to focus on specific sections of the site.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            url: {
                                type: "string",
                                description: "The root URL to begin the crawl"
                            },
                            max_depth: {
                                type: "integer",
                                description: "Max depth of the crawl. Defines how far from the base URL the crawler can explore.",
                                default: 1,
                                minimum: 1
                            },
                            max_breadth: {
                                type: "integer",
                                description: "Max number of links to follow per level of the tree (i.e., per page)",
                                default: 20,
                                minimum: 1
                            },
                            limit: {
                                type: "integer",
                                description: "Total number of links the crawler will process before stopping",
                                default: 50,
                                minimum: 1
                            },
                            instructions: {
                                type: "string",
                                description: "Natural language instructions for the crawler. Instructions specify which types of pages the crawler should return."
                            },
                            select_paths: {
                                type: "array",
                                items: { type: "string" },
                                description: "Regex patterns to select only URLs with specific path patterns (e.g., /docs/.*, /api/v1.*)",
                                default: []
                            },
                            select_domains: {
                                type: "array",
                                items: { type: "string" },
                                description: "Regex patterns to restrict crawling to specific domains or subdomains (e.g., ^docs\\.example\\.com$)",
                                default: []
                            },
                            allow_external: {
                                type: "boolean",
                                description: "Whether to return external links in the final response",
                                default: true
                            },
                            extract_depth: {
                                type: "string",
                                enum: ["basic", "advanced"],
                                description: "Advanced extraction retrieves more data, including tables and embedded content, with higher success but may increase latency",
                                default: "basic"
                            },
                            format: {
                                type: "string",
                                enum: ["markdown", "text"],
                                description: "The format of the extracted web page content. markdown returns content in markdown format. text returns plain text and may increase latency.",
                                default: "markdown"
                            },
                            include_favicon: {
                                type: "boolean",
                                description: "Whether to include the favicon URL for each result",
                                default: false,
                            },
                        },
                        required: ["url"]
                    }
                },
                {
                    name: "tavily_map",
                    description: "A powerful web mapping tool that creates a structured map of website URLs, allowing you to discover and analyze site structure, content organization, and navigation paths. Perfect for site audits, content discovery, and understanding website architecture.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            url: {
                                type: "string",
                                description: "The root URL to begin the mapping"
                            },
                            max_depth: {
                                type: "integer",
                                description: "Max depth of the mapping. Defines how far from the base URL the crawler can explore",
                                default: 1,
                                minimum: 1
                            },
                            max_breadth: {
                                type: "integer",
                                description: "Max number of links to follow per level of the tree (i.e., per page)",
                                default: 20,
                                minimum: 1
                            },
                            limit: {
                                type: "integer",
                                description: "Total number of links the crawler will process before stopping",
                                default: 50,
                                minimum: 1
                            },
                            instructions: {
                                type: "string",
                                description: "Natural language instructions for the crawler"
                            },
                            select_paths: {
                                type: "array",
                                items: { type: "string" },
                                description: "Regex patterns to select only URLs with specific path patterns (e.g., /docs/.*, /api/v1.*)",
                                default: []
                            },
                            select_domains: {
                                type: "array",
                                items: { type: "string" },
                                description: "Regex patterns to restrict crawling to specific domains or subdomains (e.g., ^docs\\.example\\.com$)",
                                default: []
                            },
                            allow_external: {
                                type: "boolean",
                                description: "Whether to return external links in the final response",
                                default: true
                            }
                        },
                        required: ["url"]
                    }
                },
            ];
            return { tools };
        });

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            if (!API_KEY) {
                throw new McpError(ErrorCode.InvalidRequest, "TAVILY_API_KEY environment variable is required. Please set it before using this MCP server.");
            }
            try {
                let response;
                const args = request.params.arguments ?? {};
                switch (request.params.name) {
                    case "tavily_search":
                        if (args.country) {
                            args.topic = "general";
                        }
                        response = await this.search({
                            query: args.query,
                            search_depth: args.search_depth,
                            topic: args.topic,
                            days: args.days,
                            time_range: args.time_range,
                            max_results: args.max_results,
                            include_images: args.include_images,
                            include_image_descriptions: args.include_image_descriptions,
                            include_raw_content: args.include_raw_content,
                            include_domains: Array.isArray(args.include_domains) ? args.include_domains : [],
                            exclude_domains: Array.isArray(args.exclude_domains) ? args.exclude_domains : [],
                            country: args.country,
                            include_favicon: args.include_favicon,
                            start_date: args.start_date,
                            end_date: args.end_date
                        });
                        break;
                    case "tavily_extract":
                        response = await this.extract({
                            urls: args.urls,
                            extract_depth: args.extract_depth,
                            include_images: args.include_images,
                            format: args.format,
                            include_favicon: args.include_favicon,
                            query: args.query,
                        });
                        break;
                    case "tavily_crawl":
                        const crawlResponse = await this.crawl({
                            url: args.url,
                            max_depth: args.max_depth,
                            max_breadth: args.max_breadth,
                            limit: args.limit,
                            instructions: args.instructions,
                            select_paths: Array.isArray(args.select_paths) ? args.select_paths : [],
                            select_domains: Array.isArray(args.select_domains) ? args.select_domains : [],
                            allow_external: args.allow_external,
                            extract_depth: args.extract_depth,
                            format: args.format,
                            include_favicon: args.include_favicon,
                            chunks_per_source: 3,
                        });
                        return {
                            content: [{
                                type: "text",
                                text: formatCrawlResults(crawlResponse)
                            }]
                        };
                    case "tavily_map":
                        const mapResponse = await this.map({
                            url: args.url,
                            max_depth: args.max_depth,
                            max_breadth: args.max_breadth,
                            limit: args.limit,
                            instructions: args.instructions,
                            select_paths: Array.isArray(args.select_paths) ? args.select_paths : [],
                            select_domains: Array.isArray(args.select_domains) ? args.select_domains : [],
                            allow_external: args.allow_external
                        });
                        return {
                            content: [{
                                type: "text",
                                text: formatMapResults(mapResponse)
                            }]
                        };
                    default:
                        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
                }
                return {
                    content: [{
                        type: "text",
                        text: formatResults(response)
                    }]
                };
            }
            catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Tavily API error: ${error.message}`
                    }],
                    isError: true,
                };
            }
        });
    }

    // NEW: Helper method to make HTTP requests using fetch
    async makeRequest(endpoint: string, data: Record<string, unknown>) {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'X-Client-Source': 'MCP'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (response.status === 401) {
                throw new Error('Invalid API key');
            } else if (response.status === 429) {
                throw new Error('Usage limit exceeded');
            }
            throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        return await response.json();
    }

    // SSE: Changed to use Hono + SSE transport
    async run() {
        // Create Hono app
        const app = new Hono();

        // Enable CORS for all origins
        app.use('*', cors({
            origin: '*',
            allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
            allowHeaders: ['Content-Type', 'mcp-session-id', 'Last-Event-ID', 'mcp-protocol-version'],
            exposeHeaders: ['mcp-session-id', 'mcp-protocol-version']
        }));

        // Health check endpoint
        app.get('/health', (c) => c.json({
            status: 'healthy',
            server: 'tavily-mcp',
            version: '0.2.10'
        }));

        // SSE endpoint - establish SSE connection
        app.get('/sse', async (c) => {
            const transport = new SSEServerTransport('/messages', c.req.raw);

            // Set up cleanup when connection closes
            transport.onclose = () => {
                this.activeTransports.delete(transport.sessionId);
            };

            // Store transport by sessionId
            this.activeTransports.set(transport.sessionId, transport);

            // Connect server to transport (calls transport.start() internally)
            await this.server.connect(transport);

            // Return SSE response
            return transport.createResponse();
        });

        // Messages endpoint - receive POST messages from client
        app.post('/messages', async (c) => {
            // Extract sessionId from query parameters
            const url = new URL(c.req.url);
            const sessionId = url.searchParams.get('sessionId');

            if (!sessionId) {
                return c.json({ error: 'Missing sessionId' }, 400);
            }

            // Find the active transport
            const transport = this.activeTransports.get(sessionId);
            if (!transport) {
                return c.json({ error: 'SSE connection not established' }, 404);
            }

            // Handle the POST message
            return await transport.handlePostMessage(c.req.raw);
        });

        // Start server with Deno
        const server = Deno.serve({
            port: PORT,
            onListen: ({ hostname, port }) => {
                console.error(`Tavily MCP server running on Hono + Deno (SSE transport)`);
                console.error(`Endpoints:`);
                console.error(`  - http://localhost:${PORT}/sse (SSE connection)`);
                console.error(`  - http://localhost:${PORT}/messages (POST messages)`);
                console.error(`  - http://localhost:${PORT}/health (health check)`);
            }
        }, app.fetch);

        await server.finished;
    }

    async search(params: Record<string, unknown>) {
        const endpoint = this.baseURLs.search;
        const defaults = this.getDefaultParameters();

        const searchParams = {
            query: params.query,
            search_depth: params.search_depth,
            topic: params.topic,
            days: params.days,
            time_range: params.time_range,
            max_results: params.max_results,
            include_images: params.include_images,
            include_image_descriptions: params.include_image_descriptions,
            include_raw_content: params.include_raw_content,
            include_domains: (params.include_domains as string[]) || [],
            exclude_domains: (params.exclude_domains as string[]) || [],
            country: params.country,
            include_favicon: params.include_favicon,
            start_date: params.start_date,
            end_date: params.end_date,
            api_key: API_KEY,
        };

        // Apply default parameters
        for (const key in searchParams) {
            if (key in defaults) {
                searchParams[key] = defaults[key];
            }
        }

        // Remove conflicting parameters
        if ((searchParams.start_date || searchParams.end_date) && (searchParams.time_range || searchParams.days)) {
            searchParams.days = undefined;
            searchParams.time_range = undefined;
        }

        // Remove empty values
        const cleanedParams: Record<string, unknown> = {};
        for (const key in searchParams) {
            const value = searchParams[key];
            if (value !== "" && value !== null && value !== undefined &&
                !(Array.isArray(value) && value.length === 0)) {
                cleanedParams[key] = value;
            }
        }

        return await this.makeRequest(endpoint, cleanedParams);
    }

    async extract(params: Record<string, unknown>) {
        return await this.makeRequest(this.baseURLs.extract, {
            ...params,
            api_key: API_KEY
        });
    }

    async crawl(params: Record<string, unknown>) {
        return await this.makeRequest(this.baseURLs.crawl, {
            ...params,
            api_key: API_KEY
        });
    }

    async map(params: Record<string, unknown>) {
        return await this.makeRequest(this.baseURLs.map, {
            ...params,
            api_key: API_KEY
        });
    }
}

function formatResults(response: Record<string, unknown>) {
    const output: string[] = [];

    if (response.answer) {
        output.push(`Answer: ${response.answer}`);
    }

    output.push('Detailed Results:');
    for (const result of (response.results as Array<Record<string, unknown>>)) {
        output.push(`\nTitle: ${result.title}`);
        output.push(`URL: ${result.url}`);
        output.push(`Content: ${result.content}`);
        if (result.raw_content) {
            output.push(`Raw Content: ${result.raw_content}`);
        }
        if (result.favicon) {
            output.push(`Favicon: ${result.favicon}`);
        }
    }

    if (response.images && Array.isArray(response.images) && response.images.length > 0) {
        output.push('\nImages:');
        response.images.forEach((image, index) => {
            if (typeof image === 'string') {
                output.push(`\n[${index + 1}] URL: ${image}`);
            } else {
                output.push(`\n[${index + 1}] URL: ${image.url}`);
                if (image.description) {
                    output.push(`   Description: ${image.description}`);
                }
            }
        });
    }

    return output.join('\n');
}

function formatCrawlResults(response: Record<string, unknown>) {
    const output: string[] = [];
    output.push(`Crawl Results:`);
    output.push(`Base URL: ${response.base_url}`);
    output.push('\nCrawled Pages:');

    for (const [index, page] of (response.results as Array<Record<string, unknown>>).entries()) {
        output.push(`\n[${index + 1}] URL: ${page.url}`);
        if (page.raw_content) {
            const contentPreview = String(page.raw_content).length > 200
                ? String(page.raw_content).substring(0, 200) + "..."
                : String(page.raw_content);
            output.push(`Content: ${contentPreview}`);
        }
        if (page.favicon) {
            output.push(`Favicon: ${page.favicon}`);
        }
    }

    return output.join('\n');
}

function formatMapResults(response: Record<string, unknown>) {
    const output: string[] = [];
    output.push(`Site Map Results:`);
    output.push(`Base URL: ${response.base_url}`);
    output.push('\nMapped Pages:');

    for (const [index, page] of (response.results as string[]).entries()) {
        output.push(`\n[${index + 1}] URL: ${page}`);
    }

    return output.join('\n');
}

const server = new TavilyClient();
server.run().catch(console.error);

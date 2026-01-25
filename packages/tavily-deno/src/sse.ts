const MAXIMUM_MESSAGE_SIZE = 4 * 1024 * 1024; // 4MB

/**
 * Server transport for SSE: this will send messages over an SSE connection and receive messages from HTTP POST requests.
 *
 * Deno-native implementation using Web APIs.
 */
export class SSEServerTransport {
    private _endpoint: string;
    private _sessionId: string;
    private _controller: ReadableStreamDefaultController<Uint8Array> | null = null;
    private _encoder: TextEncoder;
    private _options: {
        enableDnsRebindingProtection?: boolean;
        allowedHosts?: string[];
        allowedOrigins?: string[];
    };

    onmessage?: (message: unknown, extra?: unknown) => void;
    onerror?: (error: Error) => void;
    onclose?: () => void;

    /**
     * Creates a new SSE server transport.
     */
    constructor(endpoint: string, req: Request, options?: {
        enableDnsRebindingProtection?: boolean;
        allowedHosts?: string[];
        allowedOrigins?: string[];
    }) {
        this._endpoint = endpoint;
        this._sessionId = crypto.randomUUID();
        this._encoder = new TextEncoder();
        this._options = options || { enableDnsRebindingProtection: false };
    }

    /**
     * Validates request headers for DNS rebinding protection.
     */
    private validateRequestHeaders(req: Request): string | undefined {
        if (!this._options.enableDnsRebindingProtection) {
            return undefined;
        }

        const url = new URL(req.url);

        // Validate Host header
        if (this._options.allowedHosts && this._options.allowedHosts.length > 0) {
            const host = url.host;
            if (!this._options.allowedHosts.includes(host)) {
                return `Invalid Host header: ${host}`;
            }
        }

        // Validate Origin header
        if (this._options.allowedOrigins && this._options.allowedOrigins.length > 0) {
            const origin = req.headers.get('Origin');
            if (origin && !this._options.allowedOrigins.includes(origin)) {
                return `Invalid Origin header: ${origin}`;
            }
        }

        return undefined;
    }

    /**
     * Starts the SSE transport - called by MCP SDK's server.connect()
     */
    async start(): Promise<void> {
        // Initialize the stream if not already started
        if (!this._controller) {
            // Create a deferred stream that will be used when createResponse is called
            this._streamDeferred = new Promise<{ resolve: (controller: ReadableStreamDefaultController<Uint8Array>) => void }>((resolve) => {
                this._resolveStream = resolve;
            });
        }
    }

    private _streamDeferred: Promise<{ resolve: (controller: ReadableStreamDefaultController<Uint8Array>) => void }> | null = null;
    private _resolveStream: ((value: { resolve: (controller: ReadableStreamDefaultController<Uint8Array>) => void }) => void) | null = null;

    /**
     * Creates the SSE response with a readable stream.
     */
    createResponse(): Response {
        if (this._controller) {
            throw new Error('SSEServerTransport already started!');
        }

        const stream = new ReadableStream<Uint8Array>({
            start: (controller) => {
                this._controller = controller;

                // Send the endpoint event with session ID
                const dummyBase = 'http://localhost';
                const endpointUrl = new URL(this._endpoint, dummyBase);
                endpointUrl.searchParams.set('sessionId', this._sessionId);
                const relativeUrlWithSession = endpointUrl.pathname + endpointUrl.search;

                this.sendEvent('endpoint', relativeUrlWithSession);

                // Resolve the deferred promise if it exists
                if (this._resolveStream) {
                    this._resolveStream({ resolve: () => { } });
                    this._resolveStream = null;
                }
            },
            cancel: () => {
                this._controller = null;
                this.onclose?.();
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }

    /**
     * Sends an SSE event.
     */
    private sendEvent(event: string, data: string): void {
        if (!this._controller) {
            throw new Error('Not connected');
        }

        const message = `event: ${event}\ndata: ${data}\n\n`;
        this._controller.enqueue(this._encoder.encode(message));
    }

    /**
     * Handles incoming POST messages.
     */
    async handlePostMessage(req: Request): Promise<Response> {
        if (!this._controller) {
            const message = 'SSE connection not established';
            this.onerror?.(new Error(message));
            return new Response(message, { status: 500 });
        }

        // Validate request headers
        const validationError = this.validateRequestHeaders(req);
        if (validationError) {
            this.onerror?.(new Error(validationError));
            return new Response(validationError, { status: 403 });
        }

        let body: string;
        try {
            const contentType = req.headers.get('content-type') ?? '';
            if (!contentType.includes('application/json')) {
                throw new Error(`Unsupported content-type: ${contentType}`);
            }

            // Check content length
            const contentLength = req.headers.get('content-length');
            if (contentLength) {
                const length = parseInt(contentLength, 10);
                if (length > MAXIMUM_MESSAGE_SIZE) {
                    throw new Error(`Message too large: ${length} bytes`);
                }
            }

            body = await req.text();
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.onerror?.(new Error(errorMsg));
            return new Response(errorMsg, { status: 400 });
        }

        try {
            const parsedMessage = JSON.parse(body);
            await this.handleMessage(parsedMessage);
        } catch {
            this.onerror?.(new Error(`Invalid message: ${body}`));
            return new Response(`Invalid message: ${body}`, { status: 400 });
        }

        return new Response('Accepted', { status: 202 });
    }

    /**
     * Handle a client message.
     */
    async handleMessage(message: unknown): Promise<void> {
        this.onmessage?.(message);
    }

    /**
     * Closes the SSE connection.
     */
    async close(): Promise<void> {
        if (this._controller) {
            try {
                this._controller.close();
            } catch {
                // Ignore errors when closing
            }
            this._controller = null;
        }
        this.onclose?.();
    }

    /**
     * Sends a message to the client via SSE.
     */
    async send(message: unknown): Promise<void> {
        if (!this._controller) {
            throw new Error('Not connected');
        }

        this.sendEvent('message', JSON.stringify(message));
    }

    /**
     * Returns the session ID for this transport.
     */
    get sessionId(): string {
        return this._sessionId;
    }
}

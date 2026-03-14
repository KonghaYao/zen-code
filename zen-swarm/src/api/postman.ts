/**
 * Postman Router
 * Collections, Requests, Environments, History, Send
 */

import { z } from 'zod';
import { router, publicProcedure, handleNotFound } from './trpc.js';
import type { PostmanStorage } from '../postman/storage.js';

// ========================================
// Schemas
// ========================================

const KeyValuePairSchema = z.object({
    key: z.string(),
    value: z.string(),
    enabled: z.boolean().default(true),
    description: z.string().optional(),
});

const AuthConfigSchema = z.object({
    type: z.enum(['none', 'bearer', 'basic', 'api_key']),
    bearer_token: z.string().optional(),
    basic_username: z.string().optional(),
    basic_password: z.string().optional(),
    api_key_key: z.string().optional(),
    api_key_value: z.string().optional(),
    api_key_location: z.enum(['header', 'query']).optional(),
});

const RequestBodySchema = z.object({
    type: z.enum(['none', 'json', 'form', 'text', 'binary']),
    content: z.string().default(''),
});

const HttpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

// ========================================
// Collection Schemas
// ========================================

const CollectionInputSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
});

const CollectionUpdateSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1).optional(),
    description: z.string().optional(),
});

// ========================================
// Request Schemas
// ========================================

const SavedRequestInputSchema = z.object({
    id: z.string().min(1),
    collection_id: z.string().min(1),
    name: z.string().min(1),
    method: HttpMethodSchema,
    url: z.string().default(''),
    headers: z.array(KeyValuePairSchema).optional().default([]),
    query_params: z.array(KeyValuePairSchema).optional().default([]),
    auth: AuthConfigSchema.optional().default({ type: 'none' }),
    body: RequestBodySchema.optional().default({ type: 'none', content: '' }),
    description: z.string().optional(),
    sort_order: z.number().optional().default(0),
});

const UpdateSavedRequestSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1).optional(),
    method: HttpMethodSchema.optional(),
    url: z.string().optional(),
    headers: z.array(KeyValuePairSchema).optional(),
    query_params: z.array(KeyValuePairSchema).optional(),
    auth: AuthConfigSchema.optional(),
    body: RequestBodySchema.optional(),
    description: z.string().optional(),
    sort_order: z.number().optional(),
});

// ========================================
// Environment Schemas
// ========================================

const EnvironmentInputSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    variables: z.array(KeyValuePairSchema).optional().default([]),
    is_active: z.boolean().optional().default(false),
});

const UpdateEnvironmentSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1).optional(),
    variables: z.array(KeyValuePairSchema).optional(),
    is_active: z.boolean().optional(),
});

// ========================================
// Send Request Schema
// ========================================

const SendRequestInputSchema = z.object({
    method: HttpMethodSchema,
    url: z.string().min(1),
    headers: z.array(KeyValuePairSchema).optional().default([]),
    query_params: z.array(KeyValuePairSchema).optional().default([]),
    auth: AuthConfigSchema.optional().default({ type: 'none' }),
    body: RequestBodySchema.optional().default({ type: 'none', content: '' }),
    environment_id: z.string().optional(),
    save_to_history: z.boolean().optional().default(true),
    request_id: z.string().optional(),
    collection_id: z.string().optional(),
    name: z.string().optional(),
});

// ========================================
// Router Factory
// ========================================

export function createPostmanRouter(postmanStorage: PostmanStorage) {
    return router({
        // ========================================
        // Collections
        // ========================================

        listCollections: publicProcedure.query(async () => {
            return postmanStorage.getAllCollections();
        }),

        getCollection: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
            const col = await postmanStorage.getCollection(input.id);
            if (!col) handleNotFound('Collection', input.id);
            return col;
        }),

        createCollection: publicProcedure.input(CollectionInputSchema).mutation(async ({ input }) => {
            return postmanStorage.createCollection(input);
        }),

        updateCollection: publicProcedure.input(CollectionUpdateSchema).mutation(async ({ input }) => {
            const { id, ...updates } = input;
            const col = await postmanStorage.getCollection(id);
            if (!col) handleNotFound('Collection', id);
            return postmanStorage.updateCollection(id, updates);
        }),

        deleteCollection: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
            const col = await postmanStorage.getCollection(input.id);
            if (!col) handleNotFound('Collection', input.id);
            await postmanStorage.deleteCollection(input.id);
            return { id: input.id };
        }),

        // ========================================
        // Saved Requests
        // ========================================

        listRequests: publicProcedure.input(z.object({ collection_id: z.string() })).query(async ({ input }) => {
            return postmanStorage.getRequestsByCollection(input.collection_id);
        }),

        getRequest: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
            const req = await postmanStorage.getRequest(input.id);
            if (!req) handleNotFound('Request', input.id);
            return req;
        }),

        createRequest: publicProcedure.input(SavedRequestInputSchema).mutation(async ({ input }) => {
            const col = await postmanStorage.getCollection(input.collection_id);
            if (!col) handleNotFound('Collection', input.collection_id);
            return postmanStorage.createRequest(input);
        }),

        updateRequest: publicProcedure.input(UpdateSavedRequestSchema).mutation(async ({ input }) => {
            const req = await postmanStorage.getRequest(input.id);
            if (!req) handleNotFound('Request', input.id);
            return postmanStorage.updateRequest(input);
        }),

        deleteRequest: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
            const req = await postmanStorage.getRequest(input.id);
            if (!req) handleNotFound('Request', input.id);
            await postmanStorage.deleteRequest(input.id);
            return { id: input.id };
        }),

        // ========================================
        // Environments
        // ========================================

        listEnvironments: publicProcedure.query(async () => {
            return postmanStorage.getAllEnvironments();
        }),

        getEnvironment: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
            const env = await postmanStorage.getEnvironment(input.id);
            if (!env) handleNotFound('Environment', input.id);
            return env;
        }),

        getActiveEnvironment: publicProcedure.query(async () => {
            return postmanStorage.getActiveEnvironment();
        }),

        createEnvironment: publicProcedure.input(EnvironmentInputSchema).mutation(async ({ input }) => {
            return postmanStorage.createEnvironment(input);
        }),

        updateEnvironment: publicProcedure.input(UpdateEnvironmentSchema).mutation(async ({ input }) => {
            const env = await postmanStorage.getEnvironment(input.id);
            if (!env) handleNotFound('Environment', input.id);
            return postmanStorage.updateEnvironment(input);
        }),

        setActiveEnvironment: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
            const env = await postmanStorage.getEnvironment(input.id);
            if (!env) handleNotFound('Environment', input.id);
            await postmanStorage.setActiveEnvironment(input.id);
            return { id: input.id };
        }),

        deleteEnvironment: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
            const env = await postmanStorage.getEnvironment(input.id);
            if (!env) handleNotFound('Environment', input.id);
            await postmanStorage.deleteEnvironment(input.id);
            return { id: input.id };
        }),

        // ========================================
        // History
        // ========================================

        listHistory: publicProcedure
            .input(
                z.object({
                    limit: z.number().min(1).max(200).optional().default(50),
                    offset: z.number().min(0).optional().default(0),
                }),
            )
            .query(async ({ input }) => {
                return postmanStorage.getHistory(input.limit, input.offset);
            }),

        getHistoryEntry: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
            const entry = await postmanStorage.getHistoryEntry(input.id);
            if (!entry) handleNotFound('HistoryEntry', input.id);
            return entry;
        }),

        clearHistory: publicProcedure
            .input(z.object({ before: z.string().datetime().optional() }))
            .mutation(async ({ input }) => {
                const count = await postmanStorage.clearHistory(input.before);
                return { deletedCount: count };
            }),

        deleteHistoryEntry: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
            await postmanStorage.deleteHistoryEntry(input.id);
            return { id: input.id };
        }),

        // ========================================
        // Send Request
        // ========================================

        send: publicProcedure.input(SendRequestInputSchema).mutation(async ({ input }) => {
            const startTime = Date.now();

            // Resolve environment variables
            let envVars: Record<string, string> = {};
            if (input.environment_id) {
                const env = await postmanStorage.getEnvironment(input.environment_id);
                if (env) {
                    envVars = Object.fromEntries(env.variables.filter((v) => v.enabled).map((v) => [v.key, v.value]));
                }
            } else {
                const activeEnv = await postmanStorage.getActiveEnvironment();
                if (activeEnv) {
                    envVars = Object.fromEntries(
                        activeEnv.variables.filter((v) => v.enabled).map((v) => [v.key, v.value]),
                    );
                }
            }

            // Variable interpolation helper
            const interpolate = (str: string): string => {
                return str.replace(/\{\{(\w+)\}\}/g, (_, key) => envVars[key] ?? `{{${key}}}`);
            };

            // Build URL with query params
            let url = interpolate(input.url);
            const enabledParams = (input.query_params ?? []).filter((p) => p.enabled && p.key);
            if (enabledParams.length > 0) {
                const urlObj = new URL(url.startsWith('http') ? url : `http://placeholder${url}`);
                enabledParams.forEach((p) => {
                    urlObj.searchParams.append(interpolate(p.key), interpolate(p.value));
                });
                if (url.startsWith('http')) {
                    url = urlObj.toString();
                } else {
                    url = `${url}${urlObj.search}`;
                }
            }

            // Build headers
            const headers: Record<string, string> = {};
            (input.headers ?? [])
                .filter((h) => h.enabled && h.key)
                .forEach((h) => {
                    headers[interpolate(h.key)] = interpolate(h.value);
                });

            // Auth
            const auth = input.auth ?? { type: 'none' };
            if (auth.type === 'bearer' && auth.bearer_token) {
                headers['Authorization'] = `Bearer ${interpolate(auth.bearer_token)}`;
            } else if (auth.type === 'basic' && auth.basic_username) {
                const creds = btoa(`${interpolate(auth.basic_username)}:${interpolate(auth.basic_password ?? '')}`);
                headers['Authorization'] = `Basic ${creds}`;
            } else if (auth.type === 'api_key' && auth.api_key_key && auth.api_key_value) {
                const keyName = interpolate(auth.api_key_key);
                const keyValue = interpolate(auth.api_key_value);
                if (auth.api_key_location === 'query') {
                    const urlObj = new URL(url.startsWith('http') ? url : `http://placeholder${url}`);
                    urlObj.searchParams.append(keyName, keyValue);
                    url = url.startsWith('http') ? urlObj.toString() : `${url}${urlObj.search}`;
                } else {
                    headers[keyName] = keyValue;
                }
            }

            // Body
            let bodyContent: BodyInit | undefined;
            const body = input.body ?? { type: 'none', content: '' };
            if (body.type === 'json' && body.content) {
                bodyContent = interpolate(body.content);
                headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
            } else if (body.type === 'form' && body.content) {
                bodyContent = interpolate(body.content);
                headers['Content-Type'] = headers['Content-Type'] ?? 'application/x-www-form-urlencoded';
            } else if (body.type === 'text' && body.content) {
                bodyContent = interpolate(body.content);
                headers['Content-Type'] = headers['Content-Type'] ?? 'text/plain';
            }

            let result: {
                status: number;
                status_text: string;
                headers: Record<string, string>;
                body: string;
                time_ms: number;
                size_bytes: number;
                history_id?: string;
                error?: string;
            };

            try {
                const response = await fetch(url, {
                    method: input.method,
                    headers,
                    body: ['GET', 'HEAD'].includes(input.method) ? undefined : bodyContent,
                });

                const responseBody = await response.text();
                const endTime = Date.now();

                const responseHeaders: Record<string, string> = {};
                response.headers.forEach((value, key) => {
                    responseHeaders[key] = value;
                });

                result = {
                    status: response.status,
                    status_text: response.statusText,
                    headers: responseHeaders,
                    body: responseBody,
                    time_ms: endTime - startTime,
                    size_bytes: new TextEncoder().encode(responseBody).length,
                };
            } catch (err) {
                const endTime = Date.now();
                result = {
                    status: 0,
                    status_text: 'Network Error',
                    headers: {},
                    body: '',
                    time_ms: endTime - startTime,
                    size_bytes: 0,
                    error: String(err),
                };
            }

            // Save to history
            if (input.save_to_history !== false) {
                const historyId = crypto.randomUUID();
                await postmanStorage.addHistory({
                    id: historyId,
                    request_id: input.request_id,
                    collection_id: input.collection_id,
                    name: input.name,
                    method: input.method,
                    url: input.url,
                    headers: input.headers ?? [],
                    query_params: input.query_params ?? [],
                    auth: input.auth ?? { type: 'none' },
                    body: input.body ?? { type: 'none', content: '' },
                    response_status: result.status || undefined,
                    response_status_text: result.status_text,
                    response_headers: result.headers,
                    response_body: result.body,
                    response_time_ms: result.time_ms,
                    response_size_bytes: result.size_bytes,
                    error: result.error,
                    executed_at: new Date().toISOString(),
                });
                result.history_id = historyId;
            }

            return result;
        }),
    });
}

export type PostmanRouter = ReturnType<typeof createPostmanRouter>;

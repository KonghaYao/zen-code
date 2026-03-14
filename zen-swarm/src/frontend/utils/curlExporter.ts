/**
 * curlExporter.ts — Convert a SavedRequest to a curl command string
 */

import type { SavedRequest, Environment, KeyValuePair } from '../types/postman.js';

function interpolate(str: string, envVars: Record<string, string>): string {
    return str.replace(/\{\{(\w+)\}\}/g, (_, key) => envVars[key] ?? `{{${key}}}`);
}

function envToRecord(env?: Environment): Record<string, string> {
    if (!env) return {};
    return Object.fromEntries(env.variables.filter((v) => v.enabled).map((v) => [v.key, v.value]));
}

function quoteShell(str: string): string {
    // Use single quotes if no single quote in the string, otherwise double
    if (!str.includes("'")) return `'${str}'`;
    return `"${str.replace(/"/g, '\\"')}"`;
}

/**
 * Export a SavedRequest (+ optional active environment) to a curl command string.
 */
export function exportToCurl(request: SavedRequest, env?: Environment): string {
    const vars = envToRecord(env);
    const parts: string[] = ['curl'];

    // Method
    if (request.method !== 'GET') {
        parts.push(`-X ${request.method}`);
    }

    // Headers
    const headers: KeyValuePair[] = request.headers.filter((h) => h.enabled && h.key);
    for (const h of headers) {
        parts.push(`-H ${quoteShell(`${interpolate(h.key, vars)}: ${interpolate(h.value, vars)}`)}`);
    }

    // Auth
    const auth = request.auth;
    if (auth.type === 'bearer' && auth.bearer_token) {
        parts.push(`-H ${quoteShell(`Authorization: Bearer ${interpolate(auth.bearer_token, vars)}`)}`);
    } else if (auth.type === 'basic' && auth.basic_username) {
        parts.push(
            `-u ${quoteShell(`${interpolate(auth.basic_username, vars)}:${interpolate(auth.basic_password ?? '', vars)}`)}`,
        );
    } else if (auth.type === 'api_key' && auth.api_key_key && auth.api_key_value) {
        if (auth.api_key_location !== 'query') {
            parts.push(
                `-H ${quoteShell(`${interpolate(auth.api_key_key, vars)}: ${interpolate(auth.api_key_value, vars)}`)}`,
            );
        }
    }

    // Body
    const body = request.body;
    if (body.type !== 'none' && body.content) {
        const content = interpolate(body.content, vars);
        if (body.type === 'json') {
            parts.push(`-H 'Content-Type: application/json'`);
            parts.push(`-d ${quoteShell(content)}`);
        } else if (body.type === 'form') {
            parts.push(`-H 'Content-Type: application/x-www-form-urlencoded'`);
            parts.push(`--data-urlencode ${quoteShell(content)}`);
        } else {
            parts.push(`-d ${quoteShell(content)}`);
        }
    }

    // Build URL with query params
    let url = interpolate(request.url, vars);
    const enabledParams = request.query_params.filter((p) => p.enabled && p.key);
    if (enabledParams.length > 0) {
        try {
            const urlObj = new URL(url.startsWith('http') ? url : `http://placeholder${url}`);
            enabledParams.forEach((p) => {
                urlObj.searchParams.append(interpolate(p.key, vars), interpolate(p.value, vars));
            });
            url = url.startsWith('http') ? urlObj.toString() : `${url}${urlObj.search}`;
        } catch {
            /* ignore malformed url */
        }
    }

    // Also add api_key to query if needed
    if (auth.type === 'api_key' && auth.api_key_location === 'query' && auth.api_key_key && auth.api_key_value) {
        try {
            const urlObj = new URL(url.startsWith('http') ? url : `http://placeholder${url}`);
            urlObj.searchParams.append(interpolate(auth.api_key_key, vars), interpolate(auth.api_key_value, vars));
            url = url.startsWith('http') ? urlObj.toString() : `${url}${urlObj.search}`;
        } catch {
            /* ignore */
        }
    }

    parts.push(quoteShell(url));

    return parts.join(' \\\n  ');
}

/**
 * httpFileParser.ts — Parse VS Code REST Client .http format
 *
 * Format:
 *   ### Request Name (optional)
 *   GET https://api.example.com/users
 *   Authorization: Bearer {{TOKEN}}
 *
 *   ### Another Request
 *   POST https://api.example.com/users
 *   Content-Type: application/json
 *
 *   { "name": "Alice" }
 *
 * Multiple requests separated by ###
 */

import type { KeyValuePair, AuthConfig, RequestBody, HttpMethod } from '../types/postman.js';
import type { ParsedCurl } from './curlParser.js';

const HTTP_METHODS_SET = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

/**
 * Parse a .http file content into an array of ParsedCurl objects.
 */
export function parseHttpFile(content: string): Array<ParsedCurl & { name?: string }> {
    const results: Array<ParsedCurl & { name?: string }> = [];

    // Split by ### separator
    const sections = content.split(/^###\s*/m);

    for (const section of sections) {
        const trimmed = section.trim();
        if (!trimmed) continue;

        const parsed = parseHttpSection(trimmed);
        if (parsed) results.push(parsed);
    }

    return results;
}

function parseHttpSection(section: string): (ParsedCurl & { name?: string }) | null {
    const lines = section.split('\n');
    let lineIdx = 0;

    // First non-comment line might be the request name (if section started with ###)
    let name: string | undefined;
    // The first line after ### is used as name if it's not a request line
    const firstLine = lines[0]?.trim() ?? '';
    if (firstLine && !isRequestLine(firstLine) && !firstLine.startsWith('#')) {
        name = firstLine;
        lineIdx = 1;
    }

    // Skip comment lines
    while (lineIdx < lines.length && (lines[lineIdx].trim().startsWith('#') || lines[lineIdx].trim() === '')) {
        lineIdx++;
    }

    // Find request line: METHOD URL
    let method: HttpMethod = 'GET';
    let url = '';
    let rawUrl = '';

    const reqLine = lines[lineIdx]?.trim() ?? '';
    if (!reqLine) return null;

    // Parse "METHOD URL" or just "URL"
    const spaceIdx = reqLine.indexOf(' ');
    if (spaceIdx > 0) {
        const candidate = reqLine.slice(0, spaceIdx).toUpperCase();
        if (HTTP_METHODS_SET.has(candidate)) {
            method = candidate as HttpMethod;
            rawUrl = reqLine.slice(spaceIdx + 1).trim();
        } else {
            // Maybe just a URL (default GET)
            rawUrl = reqLine;
        }
    } else if (reqLine.startsWith('http')) {
        rawUrl = reqLine;
    } else {
        return null;
    }

    lineIdx++;

    // Parse URL + query params from rawUrl
    let urlBase = rawUrl;
    const query_params: KeyValuePair[] = [];

    try {
        const urlObj = new URL(rawUrl.startsWith('http') ? rawUrl : `http://placeholder${rawUrl}`);
        urlObj.searchParams.forEach((value, key) => {
            query_params.push({ key, value, enabled: true });
        });
        // Remove query string from url
        urlObj.search = '';
        urlBase = rawUrl.startsWith('http') ? urlObj.toString() : rawUrl.split('?')[0];
    } catch {
        /* malformed url, keep as is */
    }

    url = urlBase;

    // Parse headers (until blank line)
    const headers: KeyValuePair[] = [];
    let contentType = '';

    while (lineIdx < lines.length) {
        const line = lines[lineIdx].trim();
        if (!line) {
            lineIdx++;
            break; // blank line = end of headers
        }
        if (line.startsWith('#') || line.startsWith('//')) {
            lineIdx++;
            continue;
        }
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
            const key = line.slice(0, colonIdx).trim();
            const value = line.slice(colonIdx + 1).trim();
            headers.push({ key, value, enabled: true });
            if (key.toLowerCase() === 'content-type') {
                contentType = value;
            }
        }
        lineIdx++;
    }

    // Remaining lines = body (until next ### or end)
    const bodyLines: string[] = [];
    while (lineIdx < lines.length) {
        const line = lines[lineIdx];
        if (line.trim().startsWith('###')) break;
        bodyLines.push(line);
        lineIdx++;
    }

    const bodyContent = bodyLines.join('\n').trim();

    // Build body
    let body: RequestBody;
    if (bodyContent) {
        if (contentType.includes('x-www-form-urlencoded')) {
            body = { type: 'form', content: bodyContent };
        } else if (contentType.includes('json') || isJsonString(bodyContent)) {
            body = { type: 'json', content: bodyContent };
        } else {
            body = { type: 'text', content: bodyContent };
        }
    } else {
        body = { type: 'none', content: '' };
    }

    // Extract auth from headers
    let auth: AuthConfig = { type: 'none' };
    const authHeader = headers.find((h) => h.key.toLowerCase() === 'authorization');
    if (authHeader) {
        const val = authHeader.value;
        if (val.startsWith('Bearer ')) {
            auth = { type: 'bearer', bearer_token: val.slice(7) };
        } else if (val.startsWith('Basic ')) {
            try {
                const decoded = atob(val.slice(6));
                const colonIdx = decoded.indexOf(':');
                auth = {
                    type: 'basic',
                    basic_username: decoded.slice(0, colonIdx),
                    basic_password: decoded.slice(colonIdx + 1),
                };
            } catch {
                auth = { type: 'none' };
            }
        }
    }

    return { name, method, url, headers, query_params, auth, body };
}

function isRequestLine(line: string): boolean {
    const upper = line.trim().toUpperCase();
    return HTTP_METHODS_SET.has(upper.split(' ')[0]) || upper.startsWith('HTTP') || line.startsWith('http');
}

function isJsonString(str: string): boolean {
    const t = str.trim();
    return (t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'));
}

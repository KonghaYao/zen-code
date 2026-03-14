/**
 * curlParser.ts — Pure function curl command parser (no side effects)
 *
 * Supports common curl flags:
 *   -X / --request         → method
 *   -H / --header          → headers
 *   -d / --data / --data-raw / --data-binary → body
 *   --data-urlencode       → form body
 *   -u / --user            → basic auth
 *   -b / --cookie          → Cookie header
 *   -G / --get + -d        → query params (GET with data)
 *   --compressed           → ignored
 *   -L / --location        → ignored
 */

import type { KeyValuePair, AuthConfig, RequestBody, HttpMethod } from '../types/postman.js';

export interface ParsedCurl {
    method: HttpMethod;
    url: string;
    headers: KeyValuePair[];
    query_params: KeyValuePair[];
    auth: AuthConfig;
    body: RequestBody;
}

// ─── tokenizer ────────────────────────────────────────────────────────────────

/**
 * Split a curl command string into tokens, respecting quotes and backslash continuations.
 */
function tokenize(input: string): string[] {
    // Normalize line continuations: \ followed by newline
    const normalized = input
        .replace(/\\\n\s*/g, ' ')
        .replace(/\\\r\n\s*/g, ' ')
        .trim();

    const tokens: string[] = [];
    let i = 0;
    const len = normalized.length;

    while (i < len) {
        // Skip whitespace
        while (i < len && /\s/.test(normalized[i])) i++;
        if (i >= len) break;

        const ch = normalized[i];

        if (ch === '"' || ch === "'") {
            // Quoted string
            const quote = ch;
            i++;
            let token = '';
            while (i < len && normalized[i] !== quote) {
                if (normalized[i] === '\\' && quote === '"') {
                    // Escape in double quotes
                    i++;
                    if (i < len) {
                        token += normalized[i];
                        i++;
                    }
                } else {
                    token += normalized[i];
                    i++;
                }
            }
            i++; // closing quote
            tokens.push(token);
        } else {
            // Unquoted token
            let token = '';
            while (i < len && !/\s/.test(normalized[i])) {
                token += normalized[i];
                i++;
            }
            tokens.push(token);
        }
    }

    return tokens;
}

// ─── parser ───────────────────────────────────────────────────────────────────

/**
 * Parse a curl string into a ParsedCurl object.
 * Returns null if the input doesn't look like a curl command.
 */
export function parseCurl(curlString: string): ParsedCurl | null {
    const trimmed = curlString.trim();
    if (!trimmed.startsWith('curl')) return null;

    const tokens = tokenize(trimmed);
    if (tokens[0] !== 'curl') return null;

    let method: HttpMethod = 'GET';
    let url = '';
    const headers: KeyValuePair[] = [];
    const dataParts: string[] = [];
    let useGet = false; // -G flag
    let auth: AuthConfig = { type: 'none' };
    let contentType = '';

    let i = 1;
    while (i < tokens.length) {
        const tok = tokens[i];

        // URL (any argument not starting with -)
        if (!tok.startsWith('-') && !url) {
            // Could be a URL or value after a flag; only grab as URL if previous wasn't a flag
            url = tok;
            i++;
            continue;
        }

        // -X / --request METHOD
        if (tok === '-X' || tok === '--request') {
            method = (tokens[++i] as HttpMethod) ?? method;
            i++;
            continue;
        }

        // -X METHOD combined (e.g. -XPOST)
        if (/^-X\w+/.test(tok)) {
            method = tok.slice(2) as HttpMethod;
            i++;
            continue;
        }

        // -H / --header "Key: Value"
        if (tok === '-H' || tok === '--header') {
            const hdr = tokens[++i] ?? '';
            const colonIdx = hdr.indexOf(':');
            if (colonIdx > 0) {
                const key = hdr.slice(0, colonIdx).trim();
                const value = hdr.slice(colonIdx + 1).trim();
                headers.push({ key, value, enabled: true });
                if (key.toLowerCase() === 'content-type') {
                    contentType = value;
                }
            }
            i++;
            continue;
        }

        // -d / --data / --data-raw / --data-binary
        if (tok === '-d' || tok === '--data' || tok === '--data-raw' || tok === '--data-binary') {
            dataParts.push(tokens[++i] ?? '');
            i++;
            continue;
        }

        // --data-urlencode
        if (tok === '--data-urlencode') {
            dataParts.push(tokens[++i] ?? '');
            i++;
            continue;
        }

        // -G / --get → treat -d as query params
        if (tok === '-G' || tok === '--get') {
            useGet = true;
            i++;
            continue;
        }

        // -u / --user "user:pass"
        if (tok === '-u' || tok === '--user') {
            const creds = tokens[++i] ?? '';
            const colonIdx = creds.indexOf(':');
            if (colonIdx > 0) {
                auth = {
                    type: 'basic',
                    basic_username: creds.slice(0, colonIdx),
                    basic_password: creds.slice(colonIdx + 1),
                };
            } else {
                auth = { type: 'basic', basic_username: creds, basic_password: '' };
            }
            i++;
            continue;
        }

        // -b / --cookie
        if (tok === '-b' || tok === '--cookie') {
            const cookieVal = tokens[++i] ?? '';
            headers.push({ key: 'Cookie', value: cookieVal, enabled: true });
            i++;
            continue;
        }

        // Flags to ignore
        if (
            [
                '--compressed',
                '-L',
                '--location',
                '-s',
                '--silent',
                '-v',
                '--verbose',
                '-k',
                '--insecure',
                '-i',
                '--include',
                '-f',
                '--fail',
                '--no-progress-meter',
            ].includes(tok)
        ) {
            i++;
            continue;
        }

        // Skip unknown option values (options that take a value argument)
        if (tok.startsWith('--') || (tok.startsWith('-') && tok.length === 2)) {
            // Known no-arg flags handled above; assume next is value
            i += 2;
            continue;
        }

        // Bare URL (not starting with -)
        if (!tok.startsWith('-') && !url) {
            url = tok;
        }

        i++;
    }

    if (!url) return null;

    // If -G flag and data parts: convert to query params
    const query_params: KeyValuePair[] = [];
    let bodyContent = '';

    if (useGet) {
        method = 'GET';
        const combined = dataParts.join('&');
        const parts = combined.split('&');
        for (const part of parts) {
            const eqIdx = part.indexOf('=');
            if (eqIdx > 0) {
                query_params.push({
                    key: decodeURIComponent(part.slice(0, eqIdx)),
                    value: decodeURIComponent(part.slice(eqIdx + 1)),
                    enabled: true,
                });
            }
        }
    } else if (dataParts.length > 0) {
        // POST by default when -d is used
        if (method === 'GET') method = 'POST';
        bodyContent = dataParts.join('&');
    }

    // Determine body type
    let body: RequestBody;
    if (bodyContent) {
        // Check for explicit content-type header or auto-detect
        const ct = contentType || headers.find((h) => h.key.toLowerCase() === 'content-type')?.value || '';
        if (ct.includes('x-www-form-urlencoded')) {
            body = { type: 'form', content: bodyContent };
        } else if (ct.includes('json') || isJsonString(bodyContent)) {
            body = { type: 'json', content: bodyContent };
        } else {
            body = { type: 'text', content: bodyContent };
        }
    } else {
        body = { type: 'none', content: '' };
    }

    return { method, url, headers, query_params, auth, body };
}

function isJsonString(str: string): boolean {
    const trimmed = str.trim();
    return (trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'));
}

/**
 * Detect if a string looks like a curl command
 */
export function isCurlCommand(input: string): boolean {
    return input.trim().startsWith('curl ') || input.trim() === 'curl';
}

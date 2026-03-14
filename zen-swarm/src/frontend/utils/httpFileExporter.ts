/**
 * httpFileExporter.ts — Export a Collection to .http file format
 */

import type { SavedRequest, Collection, Folder, Environment } from '../types/postman.js';

function interpolate(str: string, envVars: Record<string, string>): string {
    return str.replace(/\{\{(\w+)\}\}/g, (_, key) => envVars[key] ?? `{{${key}}}`);
}

function buildQueryString(request: SavedRequest, vars: Record<string, string>): string {
    const enabled = request.query_params.filter((p) => p.enabled && p.key);
    if (!enabled.length) return '';
    const parts = enabled.map(
        (p) => `${encodeURIComponent(interpolate(p.key, vars))}=${encodeURIComponent(interpolate(p.value, vars))}`,
    );
    return `?${parts.join('&')}`;
}

function buildAuthHeader(request: SavedRequest, vars: Record<string, string>): string {
    const auth = request.auth;
    if (auth.type === 'bearer' && auth.bearer_token) {
        return `Authorization: Bearer ${interpolate(auth.bearer_token, vars)}`;
    }
    if (auth.type === 'basic' && auth.basic_username) {
        const creds = btoa(`${interpolate(auth.basic_username, vars)}:${interpolate(auth.basic_password ?? '', vars)}`);
        return `Authorization: Basic ${creds}`;
    }
    if (auth.type === 'api_key' && auth.api_key_key && auth.api_key_value && auth.api_key_location !== 'query') {
        return `${interpolate(auth.api_key_key, vars)}: ${interpolate(auth.api_key_value, vars)}`;
    }
    return '';
}

function requestToHttpBlock(request: SavedRequest, vars: Record<string, string> = {}): string {
    const lines: string[] = [];
    const name = request.name || `${request.method} ${request.url}`;
    lines.push(`### ${name}`);

    // Request line
    const url = interpolate(request.url, vars) + buildQueryString(request, vars);
    lines.push(`${request.method} ${url}`);

    // Headers
    const headers = request.headers.filter((h) => h.enabled && h.key);
    for (const h of headers) {
        lines.push(`${interpolate(h.key, vars)}: ${interpolate(h.value, vars)}`);
    }

    // Auth (unless already in headers)
    const hasAuthHeader = headers.some((h) => h.key.toLowerCase() === 'authorization');
    if (!hasAuthHeader) {
        const authLine = buildAuthHeader(request, vars);
        if (authLine) lines.push(authLine);
    }

    // Content-Type from body
    const body = request.body;
    if (body.type !== 'none' && body.content) {
        const hasContentType = headers.some((h) => h.key.toLowerCase() === 'content-type');
        if (!hasContentType) {
            if (body.type === 'json') lines.push('Content-Type: application/json');
            else if (body.type === 'form') lines.push('Content-Type: application/x-www-form-urlencoded');
        }
        lines.push(''); // blank line before body
        lines.push(interpolate(body.content, vars));
    }

    return lines.join('\n');
}

/**
 * Export a Collection + its Requests (+ optional Folders) to a .http file string.
 * Groups requests by folder.
 */
export function exportToHttpFile(
    collection: Collection,
    requests: SavedRequest[],
    folders?: Folder[],
    env?: Environment,
): string {
    const vars: Record<string, string> = env
        ? Object.fromEntries(env.variables.filter((v) => v.enabled).map((v) => [v.key, v.value]))
        : {};

    const blocks: string[] = [];
    blocks.push(`# ${collection.name}`);
    if (collection.description) blocks.push(`# ${collection.description}`);
    blocks.push('');

    const folderMap = new Map<string | null, Folder | null>();
    folderMap.set(null, null);
    (folders ?? []).forEach((f) => folderMap.set(f.id, f));

    // Build folder path lookup
    function getFolderPath(folderId: string | null): string {
        if (!folderId) return '';
        const folder = folderMap.get(folderId);
        if (!folder) return folderId;
        const parentPath = getFolderPath(folder.parent_folder_id);
        return parentPath ? `${parentPath}/${folder.name}` : folder.name;
    }

    // Group requests by folder
    const byFolder = new Map<string | null, SavedRequest[]>();
    for (const req of requests) {
        const key = req.folder_id ?? null;
        if (!byFolder.has(key)) byFolder.set(key, []);
        byFolder.get(key)!.push(req);
    }

    // Root requests first
    const rootRequests = byFolder.get(null) ?? [];
    for (const req of rootRequests) {
        blocks.push(requestToHttpBlock(req, vars));
        blocks.push('');
    }

    // Then folder requests
    for (const [folderId, folderRequests] of byFolder) {
        if (folderId === null) continue;
        const folderPath = getFolderPath(folderId);
        blocks.push(`# ── ${folderPath} ──`);
        blocks.push('');
        for (const req of folderRequests) {
            blocks.push(requestToHttpBlock(req, vars));
            blocks.push('');
        }
    }

    return blocks.join('\n');
}

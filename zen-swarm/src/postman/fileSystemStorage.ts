/**
 * FileSystemPostmanStorage
 * Reads/writes ~/.zen-code/http/ instead of SQLite
 * Structure:
 *   ~/.zen-code/http/
 *     collections.json
 *     folders.json
 *     environments.json
 *     requests/{id}.json
 *     history/YYYY-MM-DD/{id}.json
 */

import { mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type {
    Collection,
    CollectionInput,
    Folder,
    FolderInput,
    UpdateFolderInput,
    SavedRequest,
    SavedRequestInput,
    UpdateSavedRequestInput,
    Environment,
    EnvironmentInput,
    UpdateEnvironmentInput,
    HistoryEntry,
    HistoryEntryInput,
    KeyValuePair,
    AuthConfig,
    RequestBody,
} from './types.js';

// ─── helpers ────────────────────────────────────────────────────────────────

function readJson<T>(path: string, fallback: T): T {
    try {
        if (!existsSync(path)) return fallback;
        return JSON.parse(readFileSync(path, 'utf-8')) as T;
    } catch {
        return fallback;
    }
}

function writeJson(path: string, data: unknown): void {
    writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
}

function now(): string {
    return new Date().toISOString();
}

function todayStr(): string {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

// ─── Storage class ───────────────────────────────────────────────────────────

export class FileSystemPostmanStorage {
    private baseDir: string;
    private requestsDir: string;
    private historyDir: string;

    constructor(baseDir?: string) {
        this.baseDir = baseDir ?? join(homedir(), '.zen-code', 'http');
        this.requestsDir = join(this.baseDir, 'requests');
        this.historyDir = join(this.baseDir, 'history');
    }

    async initialize(): Promise<void> {
        mkdirSync(this.baseDir, { recursive: true });
        mkdirSync(this.requestsDir, { recursive: true });
        mkdirSync(this.historyDir, { recursive: true });
    }

    // ── path helpers ──────────────────────────────────────────────────────────

    private collectionsPath(): string {
        return join(this.baseDir, 'collections.json');
    }

    private foldersPath(): string {
        return join(this.baseDir, 'folders.json');
    }

    private environmentsPath(): string {
        return join(this.baseDir, 'environments.json');
    }

    private requestPath(id: string): string {
        return join(this.requestsDir, `${id}.json`);
    }

    private historyEntryPath(id: string, date: string): string {
        const dir = join(this.historyDir, date);
        mkdirSync(dir, { recursive: true });
        return join(dir, `${id}.json`);
    }

    // ── Collections ───────────────────────────────────────────────────────────

    private loadCollections(): Collection[] {
        return readJson<Collection[]>(this.collectionsPath(), []);
    }

    private saveCollections(cols: Collection[]): void {
        writeJson(this.collectionsPath(), cols);
    }

    async getAllCollections(): Promise<Collection[]> {
        return this.loadCollections().sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
    }

    async getCollection(id: string): Promise<Collection | null> {
        return this.loadCollections().find((c) => c.id === id) ?? null;
    }

    async createCollection(input: CollectionInput): Promise<Collection> {
        const cols = this.loadCollections();
        const n = now();
        const col: Collection = {
            id: input.id,
            name: input.name,
            description: input.description,
            created_at: n,
            updated_at: n,
        };
        cols.push(col);
        this.saveCollections(cols);
        return col;
    }

    async updateCollection(id: string, updates: Partial<Omit<CollectionInput, 'id'>>): Promise<Collection> {
        const cols = this.loadCollections();
        const idx = cols.findIndex((c) => c.id === id);
        if (idx === -1) throw new Error(`Collection ${id} not found`);
        cols[idx] = { ...cols[idx], ...updates, updated_at: now() };
        this.saveCollections(cols);
        return cols[idx];
    }

    async deleteCollection(id: string): Promise<void> {
        const cols = this.loadCollections();
        const idx = cols.findIndex((c) => c.id === id);
        if (idx === -1) throw new Error(`Collection ${id} not found`);
        cols.splice(idx, 1);
        this.saveCollections(cols);

        // cascade: delete folders
        const folders = this.loadFolders();
        const filtered = folders.filter((f) => f.collection_id !== id);
        this.saveFolders(filtered);

        // cascade: delete requests
        const requests = this.loadAllRequests();
        const toDelete = requests.filter((r) => r.collection_id === id);
        toDelete.forEach((r) => {
            try {
                unlinkSync(this.requestPath(r.id));
            } catch {
                /* ignore */
            }
        });
    }

    // ── Folders ───────────────────────────────────────────────────────────────

    private loadFolders(): Folder[] {
        return readJson<Folder[]>(this.foldersPath(), []);
    }

    private saveFolders(folders: Folder[]): void {
        writeJson(this.foldersPath(), folders);
    }

    async getFoldersByCollection(collectionId: string): Promise<Folder[]> {
        return this.loadFolders()
            .filter((f) => f.collection_id === collectionId)
            .sort((a, b) => a.sort_order - b.sort_order);
    }

    async getFolder(id: string): Promise<Folder | null> {
        return this.loadFolders().find((f) => f.id === id) ?? null;
    }

    async createFolder(input: FolderInput): Promise<Folder> {
        const folders = this.loadFolders();
        const n = now();
        const folder: Folder = {
            id: input.id,
            collection_id: input.collection_id,
            parent_folder_id: input.parent_folder_id ?? null,
            name: input.name,
            sort_order: input.sort_order ?? 0,
            created_at: n,
            updated_at: n,
        };
        folders.push(folder);
        this.saveFolders(folders);
        return folder;
    }

    async updateFolder(input: UpdateFolderInput): Promise<Folder> {
        const folders = this.loadFolders();
        const idx = folders.findIndex((f) => f.id === input.id);
        if (idx === -1) throw new Error(`Folder ${input.id} not found`);
        const updated: Folder = {
            ...folders[idx],
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.parent_folder_id !== undefined ? { parent_folder_id: input.parent_folder_id } : {}),
            ...(input.sort_order !== undefined ? { sort_order: input.sort_order } : {}),
            updated_at: now(),
        };
        folders[idx] = updated;
        this.saveFolders(folders);
        return updated;
    }

    async deleteFolder(id: string): Promise<void> {
        const folders = this.loadFolders();

        // Collect all descendant folder ids (recursive)
        const toDelete = new Set<string>();
        const queue = [id];
        while (queue.length) {
            const current = queue.shift()!;
            toDelete.add(current);
            folders.filter((f) => f.parent_folder_id === current).forEach((f) => queue.push(f.id));
        }

        // Remove folders
        const filtered = folders.filter((f) => !toDelete.has(f.id));
        this.saveFolders(filtered);

        // Delete requests in those folders
        const requests = this.loadAllRequests();
        const toDelRequests = requests.filter((r) => r.folder_id && toDelete.has(r.folder_id));
        toDelRequests.forEach((r) => {
            try {
                unlinkSync(this.requestPath(r.id));
            } catch {
                /* ignore */
            }
        });
    }

    // ── Requests ──────────────────────────────────────────────────────────────

    private loadAllRequests(): SavedRequest[] {
        if (!existsSync(this.requestsDir)) return [];
        const files = readdirSync(this.requestsDir).filter((f) => f.endsWith('.json'));
        const result: SavedRequest[] = [];
        for (const file of files) {
            try {
                const data = JSON.parse(readFileSync(join(this.requestsDir, file), 'utf-8')) as SavedRequest;
                result.push(data);
            } catch {
                /* skip corrupt files */
            }
        }
        return result;
    }

    async getRequestsByCollection(collectionId: string, folderId?: string | null): Promise<SavedRequest[]> {
        const all = this.loadAllRequests().filter((r) => r.collection_id === collectionId);
        if (folderId === undefined) {
            // return all regardless of folder
            return all.sort((a, b) => a.sort_order - b.sort_order);
        }
        return all.filter((r) => r.folder_id === folderId).sort((a, b) => a.sort_order - b.sort_order);
    }

    async getRequest(id: string): Promise<SavedRequest | null> {
        const path = this.requestPath(id);
        if (!existsSync(path)) return null;
        try {
            return JSON.parse(readFileSync(path, 'utf-8')) as SavedRequest;
        } catch {
            return null;
        }
    }

    async createRequest(input: SavedRequestInput): Promise<SavedRequest> {
        const n = now();
        const req: SavedRequest = {
            id: input.id,
            collection_id: input.collection_id,
            folder_id: input.folder_id ?? null,
            name: input.name,
            method: input.method,
            url: input.url,
            headers: input.headers ?? [],
            query_params: input.query_params ?? [],
            auth: input.auth ?? { type: 'none' },
            body: input.body ?? { type: 'none', content: '' },
            description: input.description,
            sort_order: input.sort_order ?? 0,
            created_at: n,
            updated_at: n,
        };
        writeJson(this.requestPath(input.id), req);
        return req;
    }

    async updateRequest(input: UpdateSavedRequestInput): Promise<SavedRequest> {
        const existing = await this.getRequest(input.id);
        if (!existing) throw new Error(`Request ${input.id} not found`);
        const updated: SavedRequest = {
            ...existing,
            ...(input.folder_id !== undefined ? { folder_id: input.folder_id } : {}),
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.method !== undefined ? { method: input.method } : {}),
            ...(input.url !== undefined ? { url: input.url } : {}),
            ...(input.headers !== undefined ? { headers: input.headers } : {}),
            ...(input.query_params !== undefined ? { query_params: input.query_params } : {}),
            ...(input.auth !== undefined ? { auth: input.auth } : {}),
            ...(input.body !== undefined ? { body: input.body } : {}),
            ...(input.description !== undefined ? { description: input.description } : {}),
            ...(input.sort_order !== undefined ? { sort_order: input.sort_order } : {}),
            updated_at: now(),
        };
        writeJson(this.requestPath(input.id), updated);
        return updated;
    }

    async moveRequest(requestId: string, folderId: string | null): Promise<SavedRequest> {
        return this.updateRequest({ id: requestId, folder_id: folderId });
    }

    async deleteRequest(id: string): Promise<void> {
        const path = this.requestPath(id);
        if (!existsSync(path)) throw new Error(`Request ${id} not found`);
        unlinkSync(path);
    }

    // ── Environments ──────────────────────────────────────────────────────────

    private loadEnvironments(): Environment[] {
        return readJson<Environment[]>(this.environmentsPath(), []);
    }

    private saveEnvironments(envs: Environment[]): void {
        writeJson(this.environmentsPath(), envs);
    }

    async getAllEnvironments(): Promise<Environment[]> {
        return this.loadEnvironments().sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
    }

    async getEnvironment(id: string): Promise<Environment | null> {
        return this.loadEnvironments().find((e) => e.id === id) ?? null;
    }

    async getActiveEnvironment(): Promise<Environment | null> {
        return this.loadEnvironments().find((e) => e.is_active) ?? null;
    }

    async createEnvironment(input: EnvironmentInput): Promise<Environment> {
        const envs = this.loadEnvironments();
        const n = now();
        const env: Environment = {
            id: input.id,
            name: input.name,
            variables: input.variables ?? [],
            is_active: input.is_active ?? false,
            created_at: n,
            updated_at: n,
        };
        envs.push(env);
        this.saveEnvironments(envs);
        return env;
    }

    async updateEnvironment(input: UpdateEnvironmentInput): Promise<Environment> {
        const envs = this.loadEnvironments();
        const idx = envs.findIndex((e) => e.id === input.id);
        if (idx === -1) throw new Error(`Environment ${input.id} not found`);
        envs[idx] = {
            ...envs[idx],
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.variables !== undefined ? { variables: input.variables } : {}),
            ...(input.is_active !== undefined ? { is_active: input.is_active } : {}),
            updated_at: now(),
        };
        this.saveEnvironments(envs);
        return envs[idx];
    }

    async setActiveEnvironment(id: string): Promise<void> {
        const envs = this.loadEnvironments();
        const updated = envs.map((e) => ({ ...e, is_active: e.id === id, updated_at: now() }));
        this.saveEnvironments(updated);
    }

    async deleteEnvironment(id: string): Promise<void> {
        const envs = this.loadEnvironments();
        const idx = envs.findIndex((e) => e.id === id);
        if (idx === -1) throw new Error(`Environment ${id} not found`);
        envs.splice(idx, 1);
        this.saveEnvironments(envs);
    }

    // ── History ───────────────────────────────────────────────────────────────

    private loadAllHistory(): HistoryEntry[] {
        if (!existsSync(this.historyDir)) return [];
        const entries: HistoryEntry[] = [];
        try {
            const dates = readdirSync(this.historyDir).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
            for (const date of dates) {
                const dateDir = join(this.historyDir, date);
                const files = readdirSync(dateDir).filter((f) => f.endsWith('.json'));
                for (const file of files) {
                    try {
                        const data = JSON.parse(readFileSync(join(dateDir, file), 'utf-8')) as HistoryEntry;
                        entries.push(data);
                    } catch {
                        /* skip */
                    }
                }
            }
        } catch {
            /* ignore */
        }
        return entries;
    }

    async getHistory(limit = 50, offset = 0): Promise<HistoryEntry[]> {
        return this.loadAllHistory()
            .sort((a, b) => new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime())
            .slice(offset, offset + limit);
    }

    async getHistoryEntry(id: string): Promise<HistoryEntry | null> {
        const all = this.loadAllHistory();
        return all.find((e) => e.id === id) ?? null;
    }

    async addHistory(input: HistoryEntryInput): Promise<HistoryEntry> {
        const date = input.executed_at.slice(0, 10);
        const entry: HistoryEntry = {
            id: input.id,
            request_id: input.request_id,
            collection_id: input.collection_id,
            name: input.name,
            method: input.method,
            url: input.url,
            headers: input.headers ?? [],
            query_params: input.query_params ?? [],
            auth: input.auth ?? { type: 'none' },
            body: input.body ?? { type: 'none', content: '' },
            response_status: input.response_status,
            response_status_text: input.response_status_text,
            response_headers: input.response_headers,
            response_body: input.response_body,
            response_time_ms: input.response_time_ms,
            response_size_bytes: input.response_size_bytes,
            error: input.error,
            executed_at: input.executed_at,
        };
        writeJson(this.historyEntryPath(input.id, date), entry);
        return entry;
    }

    async clearHistory(before?: string): Promise<number> {
        const all = this.loadAllHistory();
        const toDelete = before ? all.filter((e) => e.executed_at < before) : all;
        toDelete.forEach((e) => {
            const date = e.executed_at.slice(0, 10);
            try {
                unlinkSync(join(this.historyDir, date, `${e.id}.json`));
            } catch {
                /* ignore */
            }
        });
        return toDelete.length;
    }

    async deleteHistoryEntry(id: string): Promise<void> {
        const entry = await this.getHistoryEntry(id);
        if (!entry) return;
        const date = entry.executed_at.slice(0, 10);
        try {
            unlinkSync(join(this.historyDir, date, `${id}.json`));
        } catch {
            /* ignore */
        }
    }

    // ── Auto-archive helper ───────────────────────────────────────────────────

    /**
     * Ensure "default" collection and today's subfolder exist.
     * Returns { collectionId, folderId }
     */
    async ensureDefaultArchiveFolder(): Promise<{ collectionId: string; folderId: string }> {
        const defaultName = 'default';
        const todayName = todayStr();

        // Find or create "default" collection
        let col = (await this.getAllCollections()).find((c) => c.name === defaultName);
        if (!col) {
            col = await this.createCollection({ id: crypto.randomUUID(), name: defaultName });
        }

        // Find or create today's folder inside "default"
        const folders = await this.getFoldersByCollection(col.id);
        let folder = folders.find((f) => f.name === todayName && f.parent_folder_id === null);
        if (!folder) {
            folder = await this.createFolder({
                id: crypto.randomUUID(),
                collection_id: col.id,
                parent_folder_id: null,
                name: todayName,
            });
        }

        return { collectionId: col.id, folderId: folder.id };
    }

    close(): void {
        // No-op for file system storage
    }
}

// Keep PostmanStorage as alias for backward compat
export { FileSystemPostmanStorage as PostmanStorage };

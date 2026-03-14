/**
 * Postman Module Types
 * HTTP client for testing and exploring APIs
 */

// ========================================
// Core Types
// ========================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type AuthType = 'none' | 'bearer' | 'basic' | 'api_key';

export type BodyType = 'none' | 'json' | 'form' | 'text' | 'binary';

export interface KeyValuePair {
    key: string;
    value: string;
    enabled: boolean;
    description?: string;
}

export interface AuthConfig {
    type: AuthType;
    bearer_token?: string;
    basic_username?: string;
    basic_password?: string;
    api_key_key?: string;
    api_key_value?: string;
    api_key_location?: 'header' | 'query';
}

export interface RequestBody {
    type: BodyType;
    content: string; // JSON string / raw text / form encoded
}

// ========================================
// Collection
// ========================================

export interface Collection {
    id: string;
    name: string;
    description?: string;
    created_at: string;
    updated_at: string;
}

export interface CollectionInput {
    id: string;
    name: string;
    description?: string;
}

// ========================================
// Folder
// ========================================

export interface Folder {
    id: string;
    collection_id: string;
    parent_folder_id: string | null; // null = Collection root
    name: string;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface FolderInput {
    id: string;
    collection_id: string;
    parent_folder_id?: string | null;
    name: string;
    sort_order?: number;
}

export interface UpdateFolderInput {
    id: string;
    name?: string;
    parent_folder_id?: string | null;
    sort_order?: number;
}

// ========================================
// Request (saved)
// ========================================

export interface SavedRequest {
    id: string;
    collection_id: string;
    folder_id: string | null; // null = Collection root
    name: string;
    method: HttpMethod;
    url: string;
    headers: KeyValuePair[];
    query_params: KeyValuePair[];
    auth: AuthConfig;
    body: RequestBody;
    description?: string;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface SavedRequestInput {
    id: string;
    collection_id: string;
    folder_id?: string | null;
    name: string;
    method: HttpMethod;
    url: string;
    headers?: KeyValuePair[];
    query_params?: KeyValuePair[];
    auth?: AuthConfig;
    body?: RequestBody;
    description?: string;
    sort_order?: number;
}

export interface UpdateSavedRequestInput {
    id: string;
    folder_id?: string | null;
    name?: string;
    method?: HttpMethod;
    url?: string;
    headers?: KeyValuePair[];
    query_params?: KeyValuePair[];
    auth?: AuthConfig;
    body?: RequestBody;
    description?: string;
    sort_order?: number;
}

// ========================================
// Environment
// ========================================

export interface Environment {
    id: string;
    name: string;
    variables: KeyValuePair[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface EnvironmentInput {
    id: string;
    name: string;
    variables?: KeyValuePair[];
    is_active?: boolean;
}

export interface UpdateEnvironmentInput {
    id: string;
    name?: string;
    variables?: KeyValuePair[];
    is_active?: boolean;
}

// ========================================
// History (request execution record)
// ========================================

export interface HistoryEntry {
    id: string;
    request_id?: string;
    collection_id?: string;
    name?: string;
    method: HttpMethod;
    url: string;
    headers: KeyValuePair[];
    query_params: KeyValuePair[];
    auth: AuthConfig;
    body: RequestBody;
    response_status?: number;
    response_status_text?: string;
    response_headers?: Record<string, string>;
    response_body?: string;
    response_time_ms?: number;
    response_size_bytes?: number;
    error?: string;
    executed_at: string;
}

export interface HistoryEntryInput {
    id: string;
    request_id?: string;
    collection_id?: string;
    name?: string;
    method: HttpMethod;
    url: string;
    headers?: KeyValuePair[];
    query_params?: KeyValuePair[];
    auth?: AuthConfig;
    body?: RequestBody;
    response_status?: number;
    response_status_text?: string;
    response_headers?: Record<string, string>;
    response_body?: string;
    response_time_ms?: number;
    response_size_bytes?: number;
    error?: string;
    executed_at: string;
}

// ========================================
// Row types (File System JSON)
// ========================================

export interface CollectionRow {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

export interface FolderRow {
    id: string;
    collection_id: string;
    parent_folder_id: string | null;
    name: string;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface SavedRequestRow {
    id: string;
    collection_id: string;
    folder_id: string | null;
    name: string;
    method: string;
    url: string;
    headers: string;
    query_params: string;
    auth: string;
    body: string;
    description: string | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface EnvironmentRow {
    id: string;
    name: string;
    variables: string;
    is_active: number;
    created_at: string;
    updated_at: string;
}

export interface HistoryRow {
    id: string;
    request_id: string | null;
    collection_id: string | null;
    name: string | null;
    method: string;
    url: string;
    headers: string;
    query_params: string;
    auth: string;
    body: string;
    response_status: number | null;
    response_status_text: string | null;
    response_headers: string | null;
    response_body: string | null;
    response_time_ms: number | null;
    response_size_bytes: number | null;
    error: string | null;
    executed_at: string;
}

// ========================================
// Send Request types
// ========================================

export interface SendRequestInput {
    method: HttpMethod;
    url: string;
    headers?: KeyValuePair[];
    query_params?: KeyValuePair[];
    auth?: AuthConfig;
    body?: RequestBody;
    environment_id?: string;
    save_to_history?: boolean;
    auto_save_folder?: boolean; // true = auto-archive to default/{date}
    request_id?: string;
    collection_id?: string;
    folder_id?: string | null;
    name?: string;
}

export interface SendRequestResult {
    status: number;
    status_text: string;
    headers: Record<string, string>;
    body: string;
    time_ms: number;
    size_bytes: number;
    history_id?: string;
    error?: string;
}

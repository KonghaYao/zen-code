/**
 * Frontend Postman Types
 */

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
    content: string;
}

export interface Collection {
    id: string;
    name: string;
    description?: string;
    created_at: string;
    updated_at: string;
}

export interface SavedRequest {
    id: string;
    collection_id: string;
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

export interface Environment {
    id: string;
    name: string;
    variables: KeyValuePair[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

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

// Active editor state (unsaved)
export interface ActiveRequest {
    id?: string; // if saved
    collection_id?: string;
    name: string;
    method: HttpMethod;
    url: string;
    headers: KeyValuePair[];
    query_params: KeyValuePair[];
    auth: AuthConfig;
    body: RequestBody;
    isDirty?: boolean;
}

export const DEFAULT_REQUEST: ActiveRequest = {
    name: 'New Request',
    method: 'GET',
    url: '',
    headers: [],
    query_params: [],
    auth: { type: 'none' },
    body: { type: 'none', content: '' },
    isDirty: false,
};

export const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export const METHOD_COLORS: Record<HttpMethod, string> = {
    GET: 'text-emerald-600 bg-emerald-50',
    POST: 'text-blue-600 bg-blue-50',
    PUT: 'text-amber-600 bg-amber-50',
    PATCH: 'text-violet-600 bg-violet-50',
    DELETE: 'text-red-600 bg-red-50',
    HEAD: 'text-gray-600 bg-gray-50',
    OPTIONS: 'text-gray-600 bg-gray-50',
};

export function getStatusColor(status: number): string {
    if (status >= 200 && status < 300) return 'text-emerald-600';
    if (status >= 300 && status < 400) return 'text-blue-600';
    if (status >= 400 && status < 500) return 'text-amber-600';
    if (status >= 500) return 'text-red-600';
    return 'text-gray-500';
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

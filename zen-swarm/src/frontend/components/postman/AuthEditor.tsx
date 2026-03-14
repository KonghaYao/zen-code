/**
 * AuthEditor — configure auth type and credentials
 */

import type { AuthConfig, AuthType } from '../../types/postman.js';

interface AuthEditorProps {
    auth: AuthConfig;
    onChange: (auth: AuthConfig) => void;
}

const AUTH_TYPES: { value: AuthType; label: string }[] = [
    { value: 'none', label: 'No Auth' },
    { value: 'bearer', label: 'Bearer Token' },
    { value: 'basic', label: 'Basic Auth' },
    { value: 'api_key', label: 'API Key' },
];

export function AuthEditor({ auth, onChange }: AuthEditorProps) {
    const inputCls =
        'w-full px-2.5 py-1.5 text-sm border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white font-mono';
    const labelCls = 'block text-xs text-text-muted mb-1';

    return (
        <div className="p-3 space-y-3">
            {/* Auth Type */}
            <div>
                <label className={labelCls}>Auth Type</label>
                <select
                    value={auth.type}
                    onChange={(e) => onChange({ ...auth, type: e.target.value as AuthType })}
                    className="w-full px-2.5 py-1.5 text-sm border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                >
                    {AUTH_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                            {t.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Bearer Token */}
            {auth.type === 'bearer' && (
                <div>
                    <label className={labelCls}>Token</label>
                    <input
                        type="text"
                        value={auth.bearer_token ?? ''}
                        onChange={(e) => onChange({ ...auth, bearer_token: e.target.value })}
                        placeholder="Enter token (supports {{VAR}})"
                        className={inputCls}
                    />
                </div>
            )}

            {/* Basic Auth */}
            {auth.type === 'basic' && (
                <>
                    <div>
                        <label className={labelCls}>Username</label>
                        <input
                            type="text"
                            value={auth.basic_username ?? ''}
                            onChange={(e) => onChange({ ...auth, basic_username: e.target.value })}
                            placeholder="Username"
                            className={inputCls}
                        />
                    </div>
                    <div>
                        <label className={labelCls}>Password</label>
                        <input
                            type="password"
                            value={auth.basic_password ?? ''}
                            onChange={(e) => onChange({ ...auth, basic_password: e.target.value })}
                            placeholder="Password"
                            className={inputCls}
                        />
                    </div>
                </>
            )}

            {/* API Key */}
            {auth.type === 'api_key' && (
                <>
                    <div>
                        <label className={labelCls}>Key Name</label>
                        <input
                            type="text"
                            value={auth.api_key_key ?? ''}
                            onChange={(e) => onChange({ ...auth, api_key_key: e.target.value })}
                            placeholder="e.g. X-API-Key"
                            className={inputCls}
                        />
                    </div>
                    <div>
                        <label className={labelCls}>Key Value</label>
                        <input
                            type="text"
                            value={auth.api_key_value ?? ''}
                            onChange={(e) => onChange({ ...auth, api_key_value: e.target.value })}
                            placeholder="Key value (supports {{VAR}})"
                            className={inputCls}
                        />
                    </div>
                    <div>
                        <label className={labelCls}>Add to</label>
                        <select
                            value={auth.api_key_location ?? 'header'}
                            onChange={(e) =>
                                onChange({ ...auth, api_key_location: e.target.value as 'header' | 'query' })
                            }
                            className="w-full px-2.5 py-1.5 text-sm border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                        >
                            <option value="header">Header</option>
                            <option value="query">Query Param</option>
                        </select>
                    </div>
                </>
            )}

            {auth.type === 'none' && <p className="text-xs text-text-muted italic">No authentication will be used.</p>}
        </div>
    );
}

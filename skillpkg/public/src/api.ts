const BASE = '/api';

export interface Skill {
    id: string;
    name: string;
    description: string | null;
    keywords: string[];
    latest_version: string | null;
    downloads_total: number;
    created_at: string;
    updated_at: string;
}

export interface SkillVersion {
    id: string;
    skill_id: string;
    version: string;
    tarball_url: string;
    integrity: string;
    skill_json: Record<string, unknown>;
    readme: string | null;
    published_at: string;
    deprecated: boolean;
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, options);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error((err as { error: string }).error ?? res.statusText);
    }
    return res.json();
}

export async function searchSkills(query: string, page = 1): Promise<{ skills: Skill[]; query: string; page: number }> {
    const params = new URLSearchParams({ q: query, page: String(page) });
    return fetchJson(`${BASE}/search?${params}`);
}

export async function getSkill(name: string): Promise<{ skill: Skill; versions: SkillVersion[] }> {
    return fetchJson(`${BASE}/skills/${encodeURIComponent(name)}`);
}

export async function login(email: string, password: string) {
    return fetchJson<{ token: string; user: { id: string; username: string; email: string } }>(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
}

export async function register(username: string, email: string, password: string) {
    return fetchJson<{ token: string; user: { id: string; username: string; email: string } }>(
        `${BASE}/auth/register`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password }),
        },
    );
}

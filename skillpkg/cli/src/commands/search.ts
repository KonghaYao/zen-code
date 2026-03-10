import { apiRequest } from '../client/api.js';

interface Skill {
    id: string;
    name: string;
    description: string | null;
    keywords: string[];
    latest_version: string | null;
    downloads_total: number;
}

interface SearchResult {
    results: Skill[];
    query: string;
    page: number;
}

export async function searchSkills(query: string): Promise<void> {
    console.log(`🔍 Searching for "${query}"...\n`);

    const result = await apiRequest<SearchResult>(`/api/search?q=${encodeURIComponent(query)}&limit=20`);

    if (!result.results || result.results.length === 0) {
        console.log('No skills found.');
        return;
    }

    // Table header
    const nameW = 35;
    const verW = 12;
    const dlW = 10;
    const header = `${'NAME'.padEnd(nameW)} ${'VERSION'.padEnd(verW)} ${'DOWNLOADS'.padEnd(dlW)} DESCRIPTION`;
    console.log(header);
    console.log('─'.repeat(header.length));

    for (const skill of result.results) {
        const name = skill.name.padEnd(nameW).slice(0, nameW);
        const ver = (skill.latest_version ?? '-').padEnd(verW);
        const dl = String(skill.downloads_total).padEnd(dlW);
        const desc = skill.description?.slice(0, 60) ?? '';
        console.log(`${name} ${ver} ${dl} ${desc}`);
    }

    console.log(`\n${result.results.length} skill(s) found.`);
}

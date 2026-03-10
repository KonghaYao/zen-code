import { apiRequest } from '../client/api.js';
import { readLockfile } from '../lockfile/index.js';

interface SkillInfo {
    skill: { latest_version: string | null };
}

export async function outdated(): Promise<void> {
    const lockfile = await readLockfile();
    if (!lockfile || Object.keys(lockfile.skills).length === 0) {
        console.log('No skills installed.');
        return;
    }

    console.log('Checking for updates...\n');

    const nameW = 30;
    const verW = 12;
    let hasUpdates = false;

    console.log(`${'NAME'.padEnd(nameW)} ${'CURRENT'.padEnd(verW)} ${'LATEST'.padEnd(verW)}`);
    console.log('─'.repeat(nameW + verW + verW + 2));

    for (const [name, entry] of Object.entries(lockfile.skills)) {
        try {
            const info = await apiRequest<SkillInfo>(`/api/skills/${encodeURIComponent(name)}`);
            const latest = (info.skill as { latest_version?: string }).latest_version ?? '-';
            const current = entry.version;
            const isOutdated = latest !== '-' && latest !== current;

            if (isOutdated) {
                hasUpdates = true;
                console.log(`${name.padEnd(nameW)} ${current.padEnd(verW)} \x1b[33m${latest.padEnd(verW)}\x1b[0m`);
            }
        } catch {
            console.log(`${name.padEnd(nameW)} ${entry.version.padEnd(verW)} ${'(error)'.padEnd(verW)}`);
        }
    }

    if (!hasUpdates) {
        console.log('All skills are up to date! ✨');
    } else {
        console.log('\nRun: skillpkg update [name]');
    }
}

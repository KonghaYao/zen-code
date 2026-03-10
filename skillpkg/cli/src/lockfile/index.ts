import { getLockfilePath } from '../config.js';

export interface LockfileEntry {
    version: string;
    resolved: string;
    integrity: string;
}

export interface Lockfile {
    lockfileVersion: 1;
    skills: Record<string, LockfileEntry>;
}

export async function readLockfile(cwd?: string): Promise<Lockfile | null> {
    const path = getLockfilePath(cwd);
    try {
        const file = Bun.file(path);
        const exists = await file.exists();
        if (!exists) return null;
        return file.json();
    } catch {
        return null;
    }
}

export async function writeLockfile(lockfile: Lockfile, cwd?: string): Promise<void> {
    const path = getLockfilePath(cwd);
    await Bun.write(path, JSON.stringify(lockfile, null, 2) + '\n');
}

export function createEmptyLockfile(): Lockfile {
    return { lockfileVersion: 1, skills: {} };
}

export function addEntry(lockfile: Lockfile, name: string, entry: LockfileEntry): Lockfile {
    return {
        ...lockfile,
        skills: { ...lockfile.skills, [name]: entry },
    };
}

export function removeEntry(lockfile: Lockfile, name: string): Lockfile {
    const skills = { ...lockfile.skills };
    delete skills[name];
    return { ...lockfile, skills };
}

import { join } from 'path';
import { rm } from 'fs/promises';
import { getSkillsDir } from '../config.js';
import { readLockfile, writeLockfile, removeEntry } from '../lockfile/index.js';

export async function removeSkill(name: string): Promise<void> {
    const skillsDir = getSkillsDir();
    const skillDir = join(skillsDir, name.replace(/^@[^/]+\//, ''));

    // Remove from disk
    try {
        await rm(skillDir, { recursive: true, force: true });
        console.log(`🗑  Removed ${skillDir}`);
    } catch (e) {
        console.warn(`Could not remove directory: ${(e as Error).message}`);
    }

    // Update lockfile
    const lockfile = await readLockfile();
    if (lockfile && lockfile.skills[name]) {
        await writeLockfile(removeEntry(lockfile, name));
        console.log(`   Updated skills.lock`);
    }

    console.log(`✅ Removed ${name}`);
}

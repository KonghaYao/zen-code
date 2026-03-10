import { join } from 'path';
import { mkdir } from 'fs/promises';
import { apiRequest, downloadFile } from '../client/api.js';
import { getSkillsDir, getLockfilePath, readConfig } from '../config.js';
import { readLockfile, writeLockfile, createEmptyLockfile, addEntry } from '../lockfile/index.js';
import { createHash } from 'crypto';

interface VersionInfo {
    skill: { name: string };
    version: {
        version: string;
        tarball_url: string;
        integrity: string;
    };
}

async function extractTarball(buffer: ArrayBuffer, destDir: string): Promise<void> {
    // Write temp file
    const tmpPath = join(destDir, '__tmp.tar.gz');
    await mkdir(destDir, { recursive: true });
    await Bun.write(tmpPath, buffer);

    // Extract using tar
    const proc = Bun.spawn(['tar', '-xzf', tmpPath, '-C', destDir], {
        stdout: 'pipe',
        stderr: 'pipe',
    });
    await proc.exited;

    // Cleanup temp file
    await Bun.file(tmpPath)
        .exists()
        .then(async (exists) => {
            if (exists) {
                const rm = Bun.spawn(['rm', tmpPath]);
                await rm.exited;
            }
        });
}

export async function installSkill(spec: string): Promise<void> {
    // Parse spec: name[@version]
    const atIdx = spec.lastIndexOf('@');
    let name = spec;
    let versionSpec = 'latest';

    // Handle scoped packages like @org/skill
    if (atIdx > 0) {
        name = spec.slice(0, atIdx);
        versionSpec = spec.slice(atIdx + 1);
    }

    console.log(`📦 Installing ${name}@${versionSpec}...`);

    // Fetch version info
    const info = await apiRequest<VersionInfo>(`/api/skills/${encodeURIComponent(name)}/${versionSpec}`);
    const { version, tarball_url, integrity } = info.version;

    // Download tarball
    console.log(`   ↓ Downloading v${version}...`);
    const buffer = await downloadFile(tarball_url);

    // Verify integrity
    const hash = createHash('sha512').update(new Uint8Array(buffer)).digest('base64');
    const computed = `sha512-${hash}`;
    if (integrity && computed !== integrity) {
        throw new Error(`Integrity check failed!\n  Expected: ${integrity}\n  Got: ${computed}`);
    }

    // Extract to .claude/skills/<name>/
    const skillsDir = getSkillsDir();
    const skillDir = join(skillsDir, name.replace(/^@[^/]+\//, ''));
    console.log(`   → Extracting to ${skillDir}`);
    await extractTarball(buffer, skillDir);

    // Update lockfile
    let lockfile = (await readLockfile()) ?? createEmptyLockfile();
    lockfile = addEntry(lockfile, name, {
        version,
        resolved: tarball_url,
        integrity: computed,
    });
    await writeLockfile(lockfile);

    console.log(`✅ Installed ${name}@${version}`);
}

export async function installFromLockfile(): Promise<void> {
    const lockfile = await readLockfile();
    if (!lockfile) {
        console.error('No skills.lock found. Run: skillpkg install <name>');
        process.exit(1);
    }

    const entries = Object.entries(lockfile.skills);
    if (entries.length === 0) {
        console.log('No skills in lockfile.');
        return;
    }

    console.log(`📦 Restoring ${entries.length} skill(s) from skills.lock...`);
    for (const [name, entry] of entries) {
        console.log(`   Installing ${name}@${entry.version}...`);
        try {
            const buffer = await downloadFile(entry.resolved);

            // Verify integrity
            const hash = createHash('sha512').update(new Uint8Array(buffer)).digest('base64');
            const computed = `sha512-${hash}`;
            if (entry.integrity && computed !== entry.integrity) {
                throw new Error(`Integrity check failed for ${name}`);
            }

            const skillsDir = getSkillsDir();
            const skillDir = join(skillsDir, name.replace(/^@[^/]+\//, ''));
            await extractTarball(buffer, skillDir);
            console.log(`   ✅ ${name}@${entry.version}`);
        } catch (e) {
            console.error(`   ❌ Failed to install ${name}: ${(e as Error).message}`);
        }
    }
    console.log('Done!');
}

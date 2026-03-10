import { join, basename, relative } from 'path';
import { readdir, stat } from 'fs/promises';
import { apiRequest } from '../client/api.js';
import { readConfig } from '../config.js';

interface SkillJson {
    name: string;
    version: string;
    description?: string;
    keywords?: string[];
    files?: string[];
    dependencies?: Record<string, string>;
    license?: string;
    author?: string;
}

async function readSkillJson(dir: string): Promise<SkillJson> {
    const path = join(dir, 'skill.json');
    const file = Bun.file(path);
    const exists = await file.exists();
    if (!exists) {
        throw new Error('skill.json not found. Run: skillpkg init');
    }
    return file.json();
}

async function readSkillMd(dir: string): Promise<string> {
    const path = join(dir, 'SKILL.md');
    const file = Bun.file(path);
    const exists = await file.exists();
    if (!exists) {
        throw new Error('SKILL.md not found in current directory');
    }
    return file.text();
}

async function collectFiles(dir: string, files: string[]): Promise<Map<string, Buffer>> {
    const collected = new Map<string, Buffer>();

    async function addFile(filePath: string, arcName: string) {
        const f = Bun.file(filePath);
        const buf = Buffer.from(await f.arrayBuffer());
        collected.set(arcName, buf);
    }

    async function addDir(dirPath: string, prefix: string) {
        const entries = await readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = join(dirPath, entry.name);
            const arcPath = join(prefix, entry.name);
            if (entry.isDirectory()) {
                await addDir(fullPath, arcPath);
            } else {
                await addFile(fullPath, arcPath);
            }
        }
    }

    for (const pattern of files) {
        const fullPath = join(dir, pattern);
        const s = await stat(fullPath).catch(() => null);
        if (!s) {
            console.warn(`  ⚠ File/dir not found: ${pattern}`);
            continue;
        }
        if (s.isDirectory()) {
            await addDir(fullPath, pattern);
        } else {
            await addFile(fullPath, pattern);
        }
    }

    return collected;
}

async function createTarball(dir: string, skillJson: SkillJson): Promise<Buffer> {
    // Collect files
    const filesToPack = ['SKILL.md', 'skill.json', ...(skillJson.files ?? [])];

    // Use tar to create the tarball
    const tarArgs = [
        '-czf',
        '-',
        '-C',
        dir,
        ...filesToPack.filter((f) => {
            const fullPath = join(dir, f);
            return true; // tar will skip missing files
        }),
    ];

    const proc = Bun.spawn(['tar', ...tarArgs], {
        stdout: 'pipe',
        stderr: 'pipe',
    });

    const chunks: Buffer[] = [];
    const reader = proc.stdout.getReader();
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(Buffer.from(value));
    }
    await proc.exited;

    return Buffer.concat(chunks);
}

export async function publishSkill(options: { tag?: string } = {}): Promise<void> {
    const config = await readConfig();
    if (!config.token) {
        console.error('Not logged in. Run: skillpkg login');
        process.exit(1);
    }

    const dir = process.cwd();
    console.log('📦 Reading skill.json...');
    const skillJson = await readSkillJson(dir);

    console.log(`   Name: ${skillJson.name}@${skillJson.version}`);
    console.log(`   Files: SKILL.md, skill.json${skillJson.files?.length ? ', ' + skillJson.files.join(', ') : ''}`);

    const readme = await readSkillMd(dir);

    console.log('🗜  Packing...');
    const tarball = await createTarball(dir, skillJson);
    console.log(`   Packed ${(tarball.length / 1024).toFixed(1)} KB`);

    console.log('🚀 Publishing...');
    const result = await apiRequest<{
        success: boolean;
        name: string;
        version: string;
        tarball_url: string;
        integrity: string;
    }>('/api/publish', {
        method: 'POST',
        body: JSON.stringify({
            name: skillJson.name,
            version: skillJson.version,
            description: skillJson.description,
            keywords: skillJson.keywords ?? [],
            tag: options.tag ?? 'latest',
            tarball: tarball.toString('base64'),
            readme,
            skill_json: skillJson,
        }),
    });

    console.log(`\n✅ Published ${result.name}@${result.version}`);
    console.log(`   Integrity: ${result.integrity}`);
    console.log(`   URL: ${result.tarball_url}`);
}

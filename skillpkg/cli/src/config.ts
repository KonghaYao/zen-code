import { join } from 'path';
import { homedir } from 'os';

export interface CliConfig {
    registry?: string;
    token?: string;
    username?: string;
}

const CONFIG_DIR = join(homedir(), '.skillpkg');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export async function readConfig(): Promise<CliConfig> {
    try {
        const file = Bun.file(CONFIG_FILE);
        const exists = await file.exists();
        if (!exists) return {};
        return file.json();
    } catch {
        return {};
    }
}

export async function writeConfig(config: CliConfig): Promise<void> {
    await Bun.write(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export async function updateConfig(patch: Partial<CliConfig>): Promise<void> {
    const current = await readConfig();
    await writeConfig({ ...current, ...patch });
}

export function getSkillsDir(cwd: string = process.cwd()): string {
    return join(cwd, '.claude', 'skills');
}

export function getLockfilePath(cwd: string = process.cwd()): string {
    return join(cwd, 'skills.lock');
}

import path from 'path';
import { promises as fs } from 'fs';
export const loadAgentsMd = async () => {
    const agentsMdPath = path.join(process.cwd(), 'AGENTS.md');
    try {
        await fs.access(agentsMdPath);
        return await fs.readFile(agentsMdPath, 'utf-8');
    } catch {
        return '';
    }
};

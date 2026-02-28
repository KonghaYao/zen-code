import { loadDefaultConfigs } from '../subagents/loader';

let _agentPackage: Awaited<ReturnType<typeof loadDefaultConfigs>>;

try {
    _agentPackage = await loadDefaultConfigs();
} catch (error) {
    console.error('Failed to load agent package:', error);
    throw new Error(`Failed to initialize agent package: ${error instanceof Error ? error.message : String(error)}`);
}

export const agentPackage = _agentPackage;

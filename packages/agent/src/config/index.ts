import { loadDefaultConfigs } from '../subagents/loader';

let _agentPackage = await loadDefaultConfigs();

export const agentPackage = _agentPackage;

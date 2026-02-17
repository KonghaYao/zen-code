/**
 * TanStack Query Hooks
 *
 * Centralized export for all custom hooks using TanStack Query.
 * Import from this file for better IDE support and tree-shaking.
 *
 * Example:
 * ```tsx
 * import { useConfig, useSkills, useTasks } from './hooks';
 * ```
 */

// Config hooks
export * from './useConfig';

// MCP hooks
export * from './useMcpConfig';

// Skills hooks
export * from './useSkills';

// Models hooks
export * from './useModels';

// Tasks hooks
export * from './useTasks';

// History hooks
export * from './useHistory';

// Knowledge hooks
export * from './useKnowledge';

// Providers hooks
export * from './useProviders';

// Agents hooks
export * from './useAgents';

// Autocomplete hooks
export * from './useSkillAutocomplete';
export * from './useAgentAutocomplete';

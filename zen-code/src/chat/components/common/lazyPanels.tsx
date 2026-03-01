/**
 * Lazy-loaded Panel Components
 *
 * Dynamically imports heavy panel components to reduce initial bundle size.
 * Follows Vercel best practices:
 * - Dynamic imports for code splitting (bundle-dynamic-imports)
 * - Conditional loading (bundle-conditional)
 *
 * Usage:
 * ```tsx
 * const HistoryPanel = lazy(() => import('./HistoryPanel'));
 * ```
 */

import { lazy } from 'react';

// Lazy load panel components
export const LazyHistoryPanel = lazy(() => import('../panels/HistoryPanel').then((m) => ({ default: m.default })));
export const LazyKnowledgePanel = lazy(() => import('../panels/KnowledgePanel').then((m) => ({ default: m.default })));
export const LazySettingsPanel = lazy(() =>
    import('../panels/settings/SettingsPanel').then((m) => ({ default: m.default })),
);
export const LazyModelProviderPanel = lazy(() =>
    import('../panels/ModelProviderPanel').then((m) => ({ default: m.default })),
);
export const LazyAgentPanel = lazy(() => import('../panels/AgentPanel').then((m) => ({ default: m.default })));
export const LazyTaskPanel = lazy(() => import('../panels/TaskPanel').then((m) => ({ default: m.default })));
export const LazyMcpPanel = lazy(() => import('../panels/mcp/McpPanel').then((m) => ({ default: m.default })));
export const LazyProcessPanel = lazy(() => import('../panels/ProcessPanel').then((m) => ({ default: m.default })));
export const LazyErrorPanel = lazy(() => import('../panels/ErrorPanel').then((m) => ({ default: m.default })));

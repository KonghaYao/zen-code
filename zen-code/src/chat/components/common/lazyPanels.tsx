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

import { lazy, type LazyExoticComponent, type ComponentType } from 'react';

type LazyPanel = LazyExoticComponent<ComponentType<any>>;

// Lazy load panel components
export const LazyHistoryPanel: LazyPanel = lazy(() =>
    import('../panels/HistoryPanel').then((m) => ({ default: m.default })),
);
export const LazyKnowledgePanel: LazyPanel = lazy(() =>
    import('../panels/KnowledgePanel').then((m) => ({ default: m.default })),
);
export const LazySettingsPanel: LazyPanel = lazy(() =>
    import('../panels/settings/SettingsPanel').then((m) => ({ default: m.default })),
);
export const LazyModelProviderPanel: LazyPanel = lazy(() =>
    import('../panels/ModelProviderPanel').then((m) => ({ default: m.default })),
);
export const LazyAgentPanel: LazyPanel = lazy(() =>
    import('../panels/AgentPanel').then((m) => ({ default: m.default })),
);
export const LazyMcpPanel: LazyPanel = lazy(() =>
    import('../panels/mcp/McpPanel').then((m) => ({ default: m.default })),
);
export const LazyProcessPanel: LazyPanel = lazy(() =>
    import('../panels/ProcessPanel').then((m) => ({ default: m.default })),
);
export const LazyErrorPanel: LazyPanel = lazy(() =>
    import('../panels/ErrorPanel').then((m) => ({ default: m.default })),
);

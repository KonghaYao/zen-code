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
export const LazyHistoryPanel = lazy(() => import('./HistoryPanel').then((m) => ({ default: m.default })));
export const LazyKnowledgePanel = lazy(() => import('./KnowledgePanel').then((m) => ({ default: m.default })));
export const LazySettingsPanel = lazy(() => import('./SettingsPanel').then((m) => ({ default: m.default })));
export const LazyModelProviderPanel = lazy(() => import('./ModelProviderPanel').then((m) => ({ default: m.default })));
export const LazyAgentPanel = lazy(() => import('./AgentPanel').then((m) => ({ default: m.default })));
export const LazyTaskPanel = lazy(() => import('./TaskPanel').then((m) => ({ default: m.default })));
export const LazyMcpPanel = lazy(() => import('./McpPanel').then((m) => ({ default: m.default })));

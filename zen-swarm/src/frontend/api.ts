/**
 * tRPC React 客户端
 */

import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../api/index.js';

// 创建 tRPC React hook
export const trpc = createTRPCReact<AppRouter>();

// 导出类型供使用
export type { AppRouter };

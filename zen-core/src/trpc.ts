/**
 * tRPC 基础工具（避免循环依赖）
 */

import { initTRPC } from '@trpc/server';
import type { ZenCoreContext } from './context.js';

const t = initTRPC.context<ZenCoreContext>().create();
export const router = t.router;
export const procedure = t.procedure;

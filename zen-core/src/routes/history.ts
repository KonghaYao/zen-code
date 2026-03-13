/**
 * history 路由 - 对应 useHistory
 * 通过 LangGraph SDK 获取会话历史
 * Note: 历史记录由 LangGraph 的 thread 管理，这里提供一个简单的代理接口
 */

import { z } from 'zod';
import { router, procedure } from '../trpc.js';

export const historyRouter = router({
    // 历史记录由客户端通过 LangGraph SDK 直接访问 /api/langgraph
    // 这里提供一个占位路由，未来可扩展
    list: procedure
        .input(
            z
                .object({
                    limit: z.number().optional().default(50),
                })
                .optional(),
        )
        .query(async () => {
            // 历史记录通过 LangGraph SDK 直接获取
            // 客户端使用 useChat() 的 historyList
            return [];
        }),
});

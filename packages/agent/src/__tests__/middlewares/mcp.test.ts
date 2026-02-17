/**
 * MCPWithConfigMiddleware 基础测试
 */

import { describe, it, expect } from 'vitest';

describe('MCPWithConfigMiddleware', () => {
    it('应该正确导出', async () => {
        const { MCPWithConfigMiddleware } = await import('../../middlewares/mcpWithConfig');
        expect(MCPWithConfigMiddleware).toBeDefined();
        expect(typeof MCPWithConfigMiddleware).toBe('function');
    });
});

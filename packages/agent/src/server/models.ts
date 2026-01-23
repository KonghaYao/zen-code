/**
 * Models API
 * 提供模型列表和相关信息
 */

import { Hono } from 'hono';
import { get_allowed_models } from '../utils/get_allowed_models';


/**
 * 创建模型路由
 */
export function createModelsRouter() {
  const router = new Hono();

  /**
   * GET /api/models/allowed
   * 获取允许的模型列表
   */
  router.get('/allowed', async (c) => {
    const result = await get_allowed_models()

    return c.json({
      success: true,
      data: result,
    });
  });



  return router;
}

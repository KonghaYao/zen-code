/**
 * Zen Swarm 全局常量
 * 单一来源，避免多处硬编码导致不一致
 */

/** 服务器监听端口，优先读取 PORT 环境变量，默认 8124 */
export const SERVER_PORT = parseInt(process.env.PORT ?? '8124', 10);

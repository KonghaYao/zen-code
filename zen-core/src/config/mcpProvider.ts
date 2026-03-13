/**
 * MCP Config Provider
 *
 * 提供从 ZenSwarmMcpStorage 加载 MCP 配置的函数
 * 供 MCPMiddleware 使用
 */

import { MCPConfig } from '@langgraph-js/standard-agent';
import { ZenSwarmMcpStorage } from './storage.js';

let storageInstance: ZenSwarmMcpStorage | null = null;

/**
 * Get MCP config from storage
 *
 * @returns MCPConfig for MCPMiddleware
 */
export async function getMcpConfigFromStorage(): Promise<MCPConfig | null> {
    if (!storageInstance) {
        throw new Error('MCP config provider not initialized. Call setStorage first.');
    }

    const configObject = await storageInstance.getMcpConfigAsObject();

    if (Object.keys(configObject).length === 0) {
        return null;
    }

    return {
        servers: configObject,
    };
}

/**
 * Set storage instance for MCP config provider
 *
 * @param storage - ZenSwarmMcpStorage instance
 */
export function setMcpConfigStorage(storage: ZenSwarmMcpStorage): void {
    storageInstance = storage;
}

/**
 * Get current storage instance
 */
export function getMcpConfigStorage(): ZenSwarmMcpStorage | null {
    return storageInstance;
}

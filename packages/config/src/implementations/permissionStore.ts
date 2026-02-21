/**
 * PermissionStore - 权限配置存储管理
 * 从 ConfigStore 读取权限配置并提供 PermissionMatcher 实例
 *
 * 注意：使用 @codegraph/union-client 中的 PermissionMatcher 实现
 */

import { PermissionMatcher } from '../permission';
import type { IConfigStore } from '../interfaces/IConfigStore.js';
import type { PermissionResult } from '../permission/types';

export class PermissionStore {
    private configStore: IConfigStore;
    /** 工具名称映射 */
    toolNameMapper: Record<string, string> = {};

    private constructor(configStore: IConfigStore) {
        this.configStore = configStore;
    }

    // ========== 单例模式 ==========
    private static instance: PermissionStore | null = null;

    /**
     * 获取单例实例
     * @param configStore 配置存储实例（仅首次调用需要）
     */
    static getInstance(configStore?: IConfigStore): PermissionStore {
        if (!PermissionStore.instance) {
            if (!configStore) {
                throw new Error('PermissionStore not initialized. Provide configStore on first call.');
            }
            PermissionStore.instance = new PermissionStore(configStore);
        }
        return PermissionStore.instance;
    }

    /**
     * 重置单例（测试用）
     */
    static resetInstance(): void {
        PermissionStore.instance = null;
    }

    // ========== 业务方法 ==========

    /**
     * 获取权限匹配器实例
     */
    async getPermissions(): Promise<PermissionMatcher | undefined> {
        const data = await this.configStore.getConfig();
        if (data.permissions) {
            return PermissionMatcher.fromConfig(data.permissions);
        }
        return;
    }

    /**
     * 检查 Bash 命令权限
     */
    async checkBashPermission(command: string, cwd?: string): Promise<PermissionResult | undefined> {
        const matcher = await this.getPermissions();
        return matcher?.checkPermission({
            name: 'Bash',
            args: { command, cwd },
        });
    }

    /**
     * 检查读取文件权限
     */
    async checkReadPermission(filePath: string): Promise<PermissionResult | undefined> {
        const matcher = await this.getPermissions();
        return matcher?.checkPermission({
            name: 'Read',
            args: { file_path: filePath },
        });
    }

    /**
     * 检查写入文件权限
     */
    async checkWritePermission(filePath: string): Promise<PermissionResult | undefined> {
        const matcher = await this.getPermissions();
        return matcher?.checkPermission({
            name: 'Write',
            args: { file_path: filePath },
        });
    }
}

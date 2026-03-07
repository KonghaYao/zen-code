import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

/**
 * 初始化 SQLite 数据库路径
 * 支持跨平台路径处理
 *
 * @param inputPath - 输入路径（支持 ~ 相对路径）
 * @returns 完整的绝对路径
 */
export function initDbPath(inputPath: string): string {
    // 展开波浪号（~）到用户主目录
    const expandedPath = inputPath.replace(/^~/, os.homedir());

    // 转换为绝对路径（处理相对路径）
    const absolutePath = path.resolve(expandedPath);

    // 获取目录路径
    const dir = path.dirname(absolutePath);

    // 确保目录存在
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    return absolutePath;
}

/**
 * 检查数据库文件大小并警告
 *
 * @param dbPath - 数据库文件路径
 * @param maxSize - 最大大小（字节），默认 100MB（可通过环境变量 SQLITE_MAX_SIZE_MB 配置）
 */
export function checkDbSize(dbPath: string, maxSize?: number): void {
    if (!fs.existsSync(dbPath)) {
        process.env.DATABASE_INIT = 'true';
        return;
    }

    // 从环境变量读取配置（MB → Bytes）
    const maxSizeFromEnv = process.env.SQLITE_MAX_SIZE_MB
        ? parseInt(process.env.SQLITE_MAX_SIZE_MB, 10) * 1024 * 1024
        : undefined;

    const limit = maxSize ?? maxSizeFromEnv ?? 300 * 1024 * 1024;

    const stats = fs.statSync(dbPath);
    const sizeInBytes = stats.size;
    const sizeInMB = sizeInBytes / (1024 * 1024);

    if (sizeInBytes > limit) {
        const limitMB = limit / (1024 * 1024);
        console.trace(`⚠️  Database file is large: ${sizeInMB.toFixed(2)}MB (limit: ${limitMB.toFixed(2)}MB)`);
        console.trace(`   Path: ${dbPath}`);
        console.trace(`   Set SQLITE_MAX_SIZE_MB to adjust limit`);
    }
}

/**
 * 初始化并设置环境变量
 * 用于 process.env.SQLITE_DATABASE_URI
 *
 * @param inputPath - 输入路径
 * @returns 完整的绝对路径
 */
export function initDatabaseUri(inputPath: string): string {
    const dbPath = initDbPath(inputPath);
    process.env.SQLITE_DATABASE_URI = dbPath;
    // 检查文件大小（如果文件已存在）
    checkDbSize(dbPath);

    return dbPath;
}

/**
 * 检查数据库是否存在并返回文件状态
 *
 * @param dbPath - 数据库文件路径
 * @returns 文件是否存在及大小信息
 */
export function getDbStatus(dbPath: string): { exists: boolean; size?: number; sizeInMB?: number } {
    const exists = fs.existsSync(dbPath);

    if (!exists) {
        return { exists: false };
    }

    const stats = fs.statSync(dbPath);
    return {
        exists: true,
        size: stats.size,
        sizeInMB: stats.size / (1024 * 1024),
    };
}

/**
 * 获取默认数据库路径
 * ~/.zen-code/session.db
 */
export function getDefaultDatabasePath(): string {
    return initDbPath('~/.zen-code/session.db');
}

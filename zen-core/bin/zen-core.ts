#!/usr/bin/env bun

/**
 * zen-core CLI 入口
 * 用法: bun zen-core/bin/zen-core.ts [--port 8125]
 */

const args = process.argv.slice(2);
const portIdx = args.indexOf('--port');
if (portIdx !== -1 && args[portIdx + 1]) {
    process.env.ZEN_CORE_PORT = args[portIdx + 1];
}

// 启动服务器
await import('../src/server.js');

export {};

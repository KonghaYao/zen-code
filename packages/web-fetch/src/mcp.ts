#!/usr/bin/env node
import { MCPServer } from './mcp/index.js';
import { parseArgs } from 'util';

const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
        // 预留命令行参数，暂无需要
    },
});

const server = new MCPServer(values);
server.start();

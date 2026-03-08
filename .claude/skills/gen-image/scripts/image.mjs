#!/usr/bin/env node
/**
 * Nano Banana 图像工具 (统一入口)
 *
 * Usage:
 *   node image.mjs gen "prompt" [options]
 *   node image.mjs edit <input...> "prompt" [options]
 *
 * 环境变量:
 *   NANO_BANANA_API_KEY    API Key
 *   NANO_BANANA_BASE_URL   Base URL
 *   NANO_BANANA_MODEL      模型名称
 *
 * 全局选项:
 *   --key <key>            API Key
 *   --base-url <url>       Base URL
 *   --model <model>        模型名称
 *
 * gen 选项:
 *   --aspect <ratio>       宽高比 (默认: "1:1")
 *   --size <size>          分辨率: 512/1K/2K/4K (默认: "1K")
 *   -o, --output <path>    输出路径 (默认: "images/output.png")
 *
 * edit 选项:
 *   --aspect <ratio>       宽高比 (默认: 保持原图)
 *   --size <size>          分辨率 (默认: "2K")
 *   -p, --prompt <text>    编辑指令（多图时使用）
 *   -o, --output <path>    输出路径 (默认: "images/edited.png")
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, resolve, basename } from 'path';

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-3.1-flash-image-preview';

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

function printMissingKeyError() {
    console.error(`
Error: 未配置 API Key

请通过以下任一方式配置：

  1. 设置环境变量（推荐）：
       export NANO_BANANA_API_KEY="sk-your-api-key"

  2. 命令行参数：
       node image.mjs <命令> ... --key sk-your-api-key
`);
}

function getMimeType(filepath) {
    const ext = basename(filepath).toLowerCase().split('.').pop();
    return (
        { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' }[ext] ||
        'image/png'
    );
}

function saveImage(imgData, outputPath) {
    const fullPath = resolve(process.cwd(), outputPath);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, Buffer.from(imgData, 'base64'));
    return fullPath;
}

async function callApi(baseUrl, model, apiKey, body) {
    const url = `${baseUrl}/models/${model}:generateContent`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`API 请求失败: ${response.status} ${error}`);
    }
    const data = await response.json();
    const imgData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!imgData) throw new Error('响应中没有图片数据');
    return imgData;
}

// ─── 核心操作 ─────────────────────────────────────────────────────────────────

async function genImage({ global: g, prompt, aspectRatio = '1:1', imageSize = '1K', output = 'images/output.png' }) {
    const imgData = await callApi(g.baseUrl, g.model, g.apiKey, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            responseModalities: ['IMAGE'],
            imageConfig: { aspectRatio, imageSize },
        },
    });
    return saveImage(imgData, output);
}

async function editImage({ global: g, inputs, prompt, aspectRatio, imageSize = '2K', output = 'images/edited.png' }) {
    const imageParts = inputs.map((input) => ({
        inline_data: { mime_type: getMimeType(input), data: readFileSync(input).toString('base64') },
    }));
    const imageConfig = { imageSize };
    if (aspectRatio) imageConfig.aspectRatio = aspectRatio;

    const imgData = await callApi(g.baseUrl, g.model, g.apiKey, {
        contents: [{ parts: [{ text: prompt }, ...imageParts] }],
        generationConfig: { responseModalities: ['IMAGE'], imageConfig },
    });
    return saveImage(imgData, output);
}

// ─── 参数解析 ─────────────────────────────────────────────────────────────────

function parseArgs(argv) {
    const args = argv.slice(2);
    const command = args[0];

    if (!command || command === '--help' || command === '-h') {
        printHelp();
        process.exit(0);
    }

    const global = {
        apiKey: process.env.NANO_BANANA_API_KEY || '',
        baseUrl: process.env.NANO_BANANA_BASE_URL || DEFAULT_BASE_URL,
        model: process.env.NANO_BANANA_MODEL || DEFAULT_MODEL,
    };

    const opts = {};
    const positional = [];

    for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        const next = () => args[++i];

        switch (arg) {
            case '--key':
                global.apiKey = next();
                break;
            case '--base-url':
                global.baseUrl = next();
                break;
            case '--model':
                global.model = next();
                break;
            case '--aspect':
                opts.aspectRatio = next();
                break;
            case '--size':
                opts.imageSize = next();
                break;
            case '-o':
            case '--output':
                opts.output = next();
                break;
            case '-p':
            case '--prompt':
                opts.prompt = next();
                break;
            default:
                if (!arg.startsWith('-')) positional.push(arg);
        }
    }

    return { command, global, opts, positional };
}

// ─── 命令实现 ─────────────────────────────────────────────────────────────────

async function cmdGen({ global, opts, positional }) {
    const prompt = positional[0] || opts.prompt;
    if (!prompt) {
        console.error('Error: 请提供 prompt');
        process.exit(1);
    }
    if (!global.apiKey) {
        printMissingKeyError();
        process.exit(1);
    }

    console.log(`正在生成图片: "${prompt}"`);
    const outputPath = await genImage({
        global,
        prompt,
        aspectRatio: opts.aspectRatio,
        imageSize: opts.imageSize,
        output: opts.output,
    });
    console.log(`图片已保存至: ${outputPath}`);
}

async function cmdEdit({ global, opts, positional }) {
    // -p 明确指定时所有位置参数均为图片，否则最后一个位置参数为 prompt
    let inputs, prompt;
    if (opts.prompt) {
        inputs = positional;
        prompt = opts.prompt;
    } else {
        inputs = positional.slice(0, -1);
        prompt = positional[positional.length - 1];
    }

    if (inputs.length === 0) {
        console.error('Error: 请提供输入图片路径');
        process.exit(1);
    }
    if (!prompt) {
        console.error('Error: 请提供编辑指令（最后一个位置参数，或使用 -p）');
        process.exit(1);
    }
    for (const f of inputs) {
        if (!existsSync(f)) {
            console.error(`Error: 文件不存在: ${f}`);
            process.exit(1);
        }
    }
    if (!global.apiKey) {
        printMissingKeyError();
        process.exit(1);
    }

    console.log(`正在编辑 ${inputs.length} 张图片`);
    console.log(`编辑指令: "${prompt}"`);
    const outputPath = await editImage({
        global,
        inputs,
        prompt,
        aspectRatio: opts.aspectRatio,
        imageSize: opts.imageSize,
        output: opts.output,
    });
    console.log(`编辑结果已保存至: ${outputPath}`);
}

// ─── 帮助信息 ─────────────────────────────────────────────────────────────────

function printHelp() {
    console.log(`
Nano Banana 图像工具

用法:
  node image.mjs <命令> [参数] [选项]

命令:
  gen     <prompt>              文生图
  edit    <input...> <prompt>   编辑图片（支持多图，-p 指定 prompt）

全局选项:
  --key <key>         API Key (或设置 NANO_BANANA_API_KEY 环境变量)
  --base-url <url>    Base URL (或设置 NANO_BANANA_BASE_URL 环境变量)
  --model <model>     模型名称 (或设置 NANO_BANANA_MODEL 环境变量)

gen 选项:
  --aspect <ratio>    宽高比 (默认: "1:1")
  --size <size>       分辨率: 512/1K/2K/4K (默认: "1K")
  -o, --output <path> 输出路径 (默认: "images/output.png")

edit 选项:
  --aspect <ratio>    宽高比 (默认: 保持原图)
  --size <size>       分辨率 (默认: "2K")
  -p, --prompt <text> 编辑指令（多图时使用）
  -o, --output <path> 输出路径 (默认: "images/edited.png")

示例:
  node image.mjs gen "一只可爱的猫" --aspect 16:9 --size 2K -o cat.png
  node image.mjs edit photo.png "将背景替换为夜晚城市" -o night.png
  node image.mjs edit a.png b.png -p "融合两张图的风格" -o merged.png
`);
}

// ─── 主入口 ───────────────────────────────────────────────────────────────────

const { command, global: globalOpts, opts, positional } = parseArgs(process.argv);
const ctx = { global: globalOpts, opts, positional };

const commands = { gen: cmdGen, edit: cmdEdit };

if (!commands[command]) {
    console.error(`Error: 未知命令 "${command}"`);
    console.error(`可用命令: gen, edit`);
    process.exit(1);
}

commands[command](ctx).catch((err) => {
    console.error('错误:', err.message);
    process.exit(1);
});

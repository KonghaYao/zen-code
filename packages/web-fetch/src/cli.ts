#!/usr/bin/env node
import { webFetch, ExtractSchema } from './extract.js';
import { parseArgs } from 'util';

interface CLIOptions {
    format?: 'markdown' | 'text';
    extract_depth?: 'basic' | 'advanced';
    include_images?: boolean;
    include_favicon?: boolean;
    timeout?: number;
    output?: string;
    json?: boolean;
}

function printHelp() {
    console.log(`
用法: web-fetch <URL...> [选项]

示例:
  web-fetch https://example.com
  web-fetch https://example.com https://docs.example.com --format markdown
  web-fetch https://example.com --format text --output result.txt
  web-fetch https://example.com --extract-depth advanced --timeout 30

选项:
  --format <markdown|text>    输出格式 (默认: markdown)
  --extract-depth <basic|advanced>  提取深度 (默认: basic)
  --include-images             提取图片链接
  --include-favicon            提取 favicon
  --timeout <seconds>          超时秒数，范围 1-60 (默认: 10)
  -o, --output <file>          输出到文件
  --json                       以 JSON 格式输出
  -h, --help                   显示帮助信息
`);
}

async function main() {
    // 处理帮助参数
    if (process.argv.includes('-h') || process.argv.includes('--help')) {
        printHelp();
        process.exit(0);
    }

    try {
        const { values, positionals } = parseArgs({
            args: process.argv.slice(2),
            options: {
                format: {
                    type: 'string',
                    description: '输出格式：markdown 或 text',
                },
                extract_depth: {
                    type: 'string',
                    description: '提取深度：basic 或 advanced',
                },
                include_images: {
                    type: 'boolean',
                    description: '是否提取图片链接',
                },
                include_favicon: {
                    type: 'boolean',
                    description: '是否提取 favicon',
                },
                timeout: {
                    type: 'string',
                    description: '超时秒数（1-60）',
                },
                output: {
                    type: 'string',
                    short: 'o',
                    description: '输出文件路径',
                },
                json: {
                    type: 'boolean',
                    description: '输出为 JSON 格式',
                },
            },
            allowPositionals: true,
        });

        if (positionals.length === 0) {
            console.error('错误: 请提供至少一个 URL');
            console.error('使用示例:');
            console.error('  web-fetch https://example.com');
            console.error('  web-fetch https://example.com --format markdown');
            console.error('  web-fetch https://example.com https://docs.example.com --output result.md');
            process.exit(1);
        }

        // 验证参数
        const options: CLIOptions = {};
        if (values.format && !['markdown', 'text'].includes(values.format)) {
            console.error('错误: format 必须是 markdown 或 text');
            process.exit(1);
        }
        if (values.format) options.format = values.format as 'markdown' | 'text';

        if (values.extract_depth && !['basic', 'advanced'].includes(values.extract_depth)) {
            console.error('错误: extract_depth 必须是 basic 或 advanced');
            process.exit(1);
        }
        if (values.extract_depth) options.extract_depth = values.extract_depth as 'basic' | 'advanced';

        if (values.include_images !== undefined) options.include_images = values.include_images;
        if (values.include_favicon !== undefined) options.include_favicon = values.include_favicon;

        if (values.timeout) {
            const timeout = parseInt(values.timeout);
            if (isNaN(timeout) || timeout < 1 || timeout > 60) {
                console.error('错误: timeout 必须是 1-60 之间的数字');
                process.exit(1);
            }
            options.timeout = timeout;
        }

        if (values.json) options.json = true;
        if (values.output) options.output = values.output;

        // 准备请求参数
        const params = {
            urls: positionals,
            format: options.format || 'markdown',
            extract_depth: options.extract_depth || 'basic',
            include_images: options.include_images || false,
            include_favicon: options.include_favicon || false,
            timeout: options.timeout,
        };

        // 验证参数
        const validatedParams = ExtractSchema.parse(params);

        console.error(`正在抓取 ${positionals.length} 个 URL...`);

        // 执行抓取
        const startTime = Date.now();
        const result = await webFetch(validatedParams);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

        // 输出结果
        if (options.json || options.output) {
            // JSON 格式输出
            const jsonOutput = JSON.stringify(result, null, 2);
            if (options.output) {
                await Bun.write(options.output, jsonOutput);
                console.error(`结果已保存到: ${options.output}`);
            } else {
                console.log(jsonOutput);
            }
        } else {
            // 人性化输出
            console.error(`\n✓ 抓取完成 (${elapsed}s)`);
            console.error(`成功: ${result.results.length}, 失败: ${result.failed_results.length}`);
            console.error(`请求 ID: ${result.request_id}`);
            console.error('');

            // 输出成功结果
            for (const item of result.results) {
                console.error(`\n${'='.repeat(60)}`);
                console.error(`URL: ${item.url}`);
                console.error(`${'='.repeat(60)}\n`);

                if (options.format === 'text') {
                    console.log(item.raw_content);
                } else {
                    // Markdown 格式
                    console.log(item.raw_content);
                }

                if (item.images && item.images.length > 0) {
                    console.error(`\n📷 图片 (${item.images.length}):`);
                    for (const img of item.images) {
                        console.error(`  - ${img}`);
                    }
                }

                if (item.favicon) {
                    console.error(`\n🔖 Favicon: ${item.favicon}`);
                }
            }

            // 输出失败结果
            if (result.failed_results.length > 0) {
                console.error(`\n${'='.repeat(60)}`);
                console.error(`失败的请求:`);
                console.error(`${'='.repeat(60)}\n`);

                for (const item of result.failed_results) {
                    console.error(`❌ ${item.url}`);
                    console.error(`   ${item.error}\n`);
                }
            }
        }
    } catch (error) {
        if (error instanceof Error) {
            console.error(`错误: ${error.message}`);
            console.error(error.stack);
        } else {
            console.error('未知错误:', error);
        }
        process.exit(1);
    }
}

main();

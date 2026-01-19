import { HumanMessage } from 'langchain';
import { graph } from '../../agents/code/graph.js';
import { getConfig, initDb } from './chat/store/index.js';


/**
 * 从 stdin 读取全部内容
 */
async function readStdin(): Promise<string> {
    return new Promise((resolve, reject) => {
        let data = '';

        process.stdin.setEncoding('utf8');

        process.stdin.on('data', (chunk) => {
            data += chunk;
        });

        process.stdin.on('end', () => {
            resolve(data);
        });

        process.stdin.on('error', (error) => {
            reject(error);
        });
    });
}

/**
 * 非交互式执行模式
 * 直接调用 LangGraph Agent，不启动 TUI
 * @param prompt - 命令行参数提供的提示词（可选）
 * @param useStdin - 是否从 stdin 读取（用于管道支持）
 */
export async function runNonInteractive(prompt?: string, useStdin: boolean = false) {
    // 初始化配置（读取 ~/.zen-code/settings.json）
    await initDb();
    const config = getConfig();

    // 决定输入来源
    let finalPrompt = prompt || '';

    if (useStdin) {
        try {
            const stdinContent = await readStdin();
            finalPrompt = stdinContent.trim();
        } catch (error) {
            console.error('❌ 读取 stdin 失败:', error);
            throw error;
        }
    }

    if (!finalPrompt) {
        console.error('❌ 错误: 未提供输入内容');
        console.error('\n用法:');
        console.error('  zen-code -p "你的任务描述"');
        console.error('  echo "内容" | zen-code');
        process.exit(1);
    }

    try {
        // 构建初始状态
        const initialState = {
            messages: [new HumanMessage(finalPrompt)],
            main_model: config.main_model,
            enable_thinking: config.enable_thinking
        };

        // 调用 Graph
        const result = await graph.invoke(initialState, {
            recursionLimit: 200,
        });

        // 输出结果
        const messages = result.messages || [];
        const lastMessage = messages[messages.length - 1];

        if (lastMessage) {
            console.log(lastMessage.text);
        }

        return result;
    } catch (error) {
        console.error(`\n❌ 执行失败: ${error instanceof Error ? error.message : String(error)}\n`);
        throw error;
    }
}


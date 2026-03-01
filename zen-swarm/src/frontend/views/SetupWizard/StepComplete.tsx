/**
 * StepComplete - 初始化向导第四步：完成页
 */

import { useState } from 'react';
import { motion } from 'motion/react';

interface StepCompleteProps {
    onFinish: () => Promise<void>;
}

export function StepComplete({ onFinish }: StepCompleteProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = async () => {
        setIsLoading(true);
        await onFinish();
    };

    return (
        <motion.div
            className="flex flex-col items-center text-center gap-8 py-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
        >
            {/* 成功图标 */}
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-green-500" viewBox="0 0 24 24" fill="none">
                    <path
                        d="M5 13l4 4L19 7"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>

            {/* 标题 */}
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">配置完成！</h2>
                <p className="text-gray-500 text-sm max-w-sm">
                    你已成功配置 AI 提供商和模型。系统已为你提供默认 Agent{' '}
                    <span className="font-semibold text-gray-700">"Jarvis"</span>，可以直接开始使用。
                </p>
            </div>

            {/* 摘要卡片 */}
            <div className="w-full max-w-sm space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 text-blue-700 text-sm">
                    <span className="text-lg">🔑</span>
                    <div className="text-left">
                        <p className="font-medium">Provider 已配置</p>
                        <p className="text-xs text-blue-500">API Key 已安全存储</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 text-purple-700 text-sm">
                    <span className="text-lg">🧠</span>
                    <div className="text-left">
                        <p className="font-medium">模型已添加</p>
                        <p className="text-xs text-purple-500">可在 Config 中管理更多模型</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 text-green-700 text-sm">
                    <span className="text-lg">🤖</span>
                    <div className="text-left">
                        <p className="font-medium">默认 Agent "Jarvis" 已就绪</p>
                        <p className="text-xs text-green-500">全功能 AI 助手，支持代码和文件操作</p>
                    </div>
                </div>
            </div>

            {/* 开始使用按钮 */}
            <button
                onClick={handleClick}
                disabled={isLoading}
                className="w-full max-w-sm px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-xl transition-colors duration-150 shadow-sm cursor-pointer disabled:cursor-not-allowed"
            >
                {isLoading ? '进入中...' : '开始使用 Zen Swarm'}
            </button>
        </motion.div>
    );
}

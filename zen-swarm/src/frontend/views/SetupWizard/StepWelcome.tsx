/**
 * StepWelcome - 初始化向导第一步：欢迎页
 */

import { motion } from 'motion/react';

interface StepWelcomeProps {
    onNext: () => void;
}

export function StepWelcome({ onNext }: StepWelcomeProps) {
    return (
        <motion.div
            className="flex flex-col items-center text-center gap-8 py-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            {/* Logo / 图标 */}
            <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-4xl">🤖</span>
            </div>

            {/* 标题 */}
            <div className="space-y-3">
                <h1 className="text-3xl font-bold text-gray-900">欢迎使用 Zen Swarm</h1>
                <p className="text-gray-500 text-base max-w-sm">
                    在开始之前，让我们配置你的 AI 提供商和模型，只需几步即可完成。
                </p>
            </div>

            {/* 步骤预览 */}
            <div className="grid grid-cols-3 gap-4 w-full max-w-sm text-sm">
                <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-blue-50 text-blue-700">
                    <span className="text-lg">🔑</span>
                    <span className="font-medium">配置提供商</span>
                    <span className="text-xs text-blue-500">填写 API Key</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-purple-50 text-purple-700">
                    <span className="text-lg">🧠</span>
                    <span className="font-medium">选择模型</span>
                    <span className="text-xs text-purple-500">选择 AI 模型</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700">
                    <span className="text-lg">🚀</span>
                    <span className="font-medium">开始使用</span>
                    <span className="text-xs text-green-500">已含默认 Agent</span>
                </div>
            </div>

            {/* 开始按钮 */}
            <button
                onClick={onNext}
                className="w-full max-w-sm px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors duration-150 shadow-sm cursor-pointer"
            >
                开始配置
            </button>
        </motion.div>
    );
}

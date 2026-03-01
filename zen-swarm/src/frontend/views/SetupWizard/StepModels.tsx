/**
 * StepModels - 初始化向导第三步：模型输入
 *
 * 用户可以直接输入模型 ID，也可以点击预设快速填入
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { apiClient } from '../../api.js';
import type { ProviderType } from '../../hooks/useProviders.js';

interface ModelRow {
    id: string; // 用于 React key
    model_name: string;
    name: string;
}

const PRESETS: Record<ProviderType, { model_name: string; name: string }[]> = {
    openai: [
        { model_name: 'gpt-4o', name: 'GPT-4o' },
        { model_name: 'gpt-4o-mini', name: 'GPT-4o Mini' },
        { model_name: 'o1', name: 'O1' },
        { model_name: 'o3-mini', name: 'O3 Mini' },
    ],
    anthropic: [
        { model_name: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5' },
        { model_name: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5' },
        { model_name: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
    ],
};

let rowCounter = 0;
const newRow = (model_name = '', name = ''): ModelRow => ({
    id: String(++rowCounter),
    model_name,
    name,
});

interface StepModelsProps {
    providerId: string;
    providerType: ProviderType;
    onNext: () => void;
}

export function StepModels({ providerId, providerType, onNext }: StepModelsProps) {
    const presets = PRESETS[providerType] ?? PRESETS.openai;

    const [rows, setRows] = useState<ModelRow[]>(() => [newRow(presets[0].model_name, presets[0].name)]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const updateRow = (id: string, field: 'model_name' | 'name', value: string) => {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    };

    const removeRow = (id: string) => {
        setRows((prev) => prev.filter((r) => r.id !== id));
    };

    const addPreset = (preset: { model_name: string; name: string }) => {
        // 已存在则不重复添加
        setRows((prev) => {
            if (prev.some((r) => r.model_name === preset.model_name)) return prev;
            return [...prev, newRow(preset.model_name, preset.name)];
        });
    };

    const validRows = rows.filter((r) => r.model_name.trim());

    const handleSubmit = async () => {
        if (validRows.length === 0) {
            setError('请至少填写一个模型 ID');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            // 1. 创建模型
            const modelsToCreate = validRows.map((r) => ({
                id: r.model_name.trim(),
                name: r.name.trim() || r.model_name.trim(),
                provider_id: providerId,
                model_name: r.model_name.trim(),
            }));
            await (apiClient as any).models.createMany.mutate(modelsToCreate);
            const firstModelId = modelsToCreate[0].id;

            // 2. 创建默认提示词
            const defaultPromptId = 'default-prompt';
            await (apiClient as any).prompts.create.mutate({
                id: defaultPromptId,
                name: '默认提示词',
                content: `你是一个全能的 AI 助手，擅长代码开发、文件操作和任务规划。
你可以：
- 读写和编辑代码文件
- 执行终端命令
- 分析和调试代码
- 管理项目任务

请始终用清晰、简洁的方式回答，优先使用中文交流。`,
                change_note: '初始化默认提示词',
            });

            // 3. 获取所有可用 tools 和 middlewares
            const [tools, middlewares] = await Promise.all([
                (apiClient as any).tools.list.query() as Promise<{ id: string }[]>,
                (apiClient as any).middlewares.list.query() as Promise<{ id: string }[]>,
            ]);
            const toolsMap = Object.fromEntries(tools.map((t) => [t.id, true]));
            const middlewaresMap = Object.fromEntries(middlewares.map((m) => [m.id, true]));

            // 4. 创建默认 Agent，关联提示词、第一个模型、所有 tools/middlewares
            await (apiClient as any).agents.create.mutate({
                id: 'default',
                name: 'Jarvis',
                description: '全功能默认 Agent，支持代码开发、文件操作和任务管理',
                system_prompt: defaultPromptId,
                model: firstModelId,
                tools: toolsMap,
                middleware: middlewaresMap,
            });

            onNext();
        } catch (err: any) {
            setError(err.message ?? '初始化失败，请重试');
            setIsLoading(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="mb-5">
                <h2 className="text-xl font-semibold text-gray-900">添加 AI 模型</h2>
                <p className="text-gray-500 text-sm mt-1">填写模型 ID，或点击下方快速添加预设模型</p>
            </div>

            {/* 预设快捷按钮 */}
            <div className="flex flex-wrap gap-2 mb-4">
                {presets.map((p) => {
                    const alreadyAdded = rows.some((r) => r.model_name === p.model_name);
                    return (
                        <button
                            key={p.model_name}
                            type="button"
                            onClick={() => addPreset(p)}
                            disabled={alreadyAdded}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors duration-150 cursor-pointer disabled:cursor-default ${
                                alreadyAdded
                                    ? 'border-blue-300 bg-blue-50 text-blue-400'
                                    : 'border-gray-300 bg-white text-gray-600 hover:border-blue-400 hover:text-blue-600'
                            }`}
                        >
                            {alreadyAdded ? '✓ ' : '+ '}
                            {p.name}
                        </button>
                    );
                })}
            </div>

            {/* 模型输入列表 */}
            <div className="space-y-2">
                {rows.map((row, index) => (
                    <div key={row.id} className="flex gap-2 items-start">
                        <div className="flex-1 grid grid-cols-5 gap-2">
                            <input
                                type="text"
                                value={row.model_name}
                                onChange={(e) => updateRow(row.id, 'model_name', e.target.value)}
                                placeholder="模型 ID，如 gpt-4o"
                                className="col-span-3 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                            />
                            <input
                                type="text"
                                value={row.name}
                                onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                                placeholder="别名（可选）"
                                className="col-span-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => removeRow(row.id)}
                            disabled={rows.length === 1}
                            className="mt-0.5 w-8 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label={`删除第 ${index + 1} 行`}
                        >
                            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                                <path
                                    d="M4 4l8 8M12 4l-8 8"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </button>
                    </div>
                ))}
            </div>

            {/* 添加行按钮 */}
            <button
                type="button"
                onClick={() => setRows((prev) => [...prev, newRow()])}
                className="mt-3 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
            >
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                添加更多模型
            </button>

            {error && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">{error}</div>
            )}

            <div className="mt-5">
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isLoading || validRows.length === 0}
                    className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-xl transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed"
                >
                    {isLoading ? `初始化中 (${validRows.length} 个模型)...` : `完成配置 (${validRows.length} 个模型)`}
                </button>
            </div>
        </motion.div>
    );
}

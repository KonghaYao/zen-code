/**
 * ConfigPage - 配置页面
 *
 * 展示 SettingsContext 的使用示例
 */

import { useState } from 'react';
import { useChat } from '@langgraph-js/sdk/react';
import { useSettings } from '@codegraph/union-client';

export function ConfigPage() {
  const { currentAgent, currentChatId } = useChat();
  const { config, updateConfig, extraParams, AVAILABLE_MODELS } = useSettings();
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleModelChange = async (modelId: string) => {
    setIsUpdating(true);
    setMessage(null);

    try {
      await updateConfig({ main_model: modelId });
      setMessage({ type: 'success', text: '模型配置已更新' });
    } catch (error) {
      setMessage({ type: 'error', text: '更新失败：' + (error as Error).message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleThinkingToggle = async () => {
    setIsUpdating(true);
    setMessage(null);

    try {
      await updateConfig({ enable_thinking: !config?.enable_thinking });
      setMessage({ type: 'success', text: '思考模式已更新' });
    } catch (error) {
      setMessage({ type: 'error', text: '更新失败：' + (error as Error).message });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!config) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="text-center text-gray-500">加载配置中...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="space-y-6">
        {/* 当前状态 */}
        <section className="bg-white rounded-lg shadow p-6 dark:bg-gray-800">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">当前状态</h2>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                当前 Agent
              </label>
              <input
                type="text"
                value={currentAgent}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                由 ChatProvider 的 defaultAgent 参数控制
              </p>
            </div>

            {currentChatId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  当前会话 ID
                </label>
                <input
                  type="text"
                  value={currentChatId}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400"
                />
              </div>
            )}
          </div>
        </section>

        {/* 应用配置 - SettingsContext 使用示例 */}
        <section className="bg-white rounded-lg shadow p-6 dark:bg-gray-800">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">应用配置</h2>

          {/* 消息提示 */}
          {message && (
            <div className={`mb-4 p-3 rounded-lg ${message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
              {message.text}
            </div>
          )}

          <div className="space-y-4">
            {/* 主模型选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                主模型
              </label>
              <select
                value={extraParams.main_model}
                onChange={(e) => handleModelChange(e.target.value)}
                disabled={isUpdating}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50"
              >
                {AVAILABLE_MODELS.length === 0 ? (
                  <option value="">无可用模型</option>
                ) : (
                  AVAILABLE_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} ({model.provider})
                    </option>
                  ))
                )}
              </select>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                当前选择: {extraParams.main_model}
              </p>
            </div>

            {/* 思考模式开关 */}
            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={config.enable_thinking ?? true}
                  onChange={handleThinkingToggle}
                  disabled={isUpdating}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  启用思考模式 (enable_thinking)
                </span>
              </label>
              <p className="mt-1 ml-8 text-sm text-gray-500 dark:text-gray-400">
                {config.enable_thinking ? '已启用' : '已禁用'}
              </p>
            </div>

            {/* 其他配置信息 */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                其他配置
              </h3>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>模型提供商:</span>
                  <span className="font-mono">{config.model_provider || '未设置'}</span>
                </div>
                <div className="flex justify-between">
                  <span>OpenAI Base URL:</span>
                  <span className="font-mono text-xs">{config.openai_base_url || '未设置'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Anthropic Base URL:</span>
                  <span className="font-mono text-xs">{config.anthropic_base_url || '未设置'}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 配置说明 */}
        <section className="bg-blue-50 border border-blue-200 rounded-lg p-6 dark:bg-blue-900 dark:border-blue-700">
          <h2 className="text-xl font-semibold mb-4 text-blue-800 dark:text-blue-200">SettingsContext 使用说明</h2>

          <div className="space-y-3 text-sm text-blue-700 dark:text-blue-300">
            <p>
              SettingsContext 提供全局配置管理，仿照 zen-code 的实现方式。
            </p>

            <div className="mt-4">
              <h3 className="font-medium mb-2">可用的 Hook 和属性：</h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><code className="bg-blue-100 dark:bg-blue-800 px-1 py-0.5 rounded">config</code> - 完整的配置对象 (AppConfig)</li>
                <li><code className="bg-blue-100 dark:bg-blue-800 px-1 py-0.5 rounded">updateConfig</code> - 更新配置的函数</li>
                <li><code className="bg-blue-100 dark:bg-blue-800 px-1 py-0.5 rounded">extraParams</code> - 额外的运行时参数</li>
                <li><code className="bg-blue-100 dark:bg-blue-800 px-1 py-0.5 rounded">AVAILABLE_MODELS</code> - 可用模型列表</li>
              </ul>
            </div>

            <div className="mt-4 bg-white dark:bg-gray-800 rounded p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">配置文件位置：</p>
              <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded block">
                ~/.zen-code/settings.json
              </code>
            </div>
          </div>
        </section>

        {/* SDK 配置 */}
        <section className="bg-white rounded-lg shadow p-6 dark:bg-gray-800">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">SDK 配置</h2>

          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <p>
              SDK 通过 <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">ChatProvider</code> 的 props 配置：
            </p>

            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">apiUrl</code> - Agent Server URL (默认: http://localhost:8123)</li>
              <li><code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">defaultAgent</code> - 默认 Agent ID (默认: code)</li>
              <li><code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">defaultHeaders</code> - 默认 HTTP 请求头</li>
              <li><code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">withCredentials</code> - 是否包含 Cookie</li>
              <li><code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">showHistory</code> - 是否显示历史记录</li>
              <li><code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">showGraph</code> - 是否显示图可视化</li>
            </ul>

            <div className="mt-4 bg-gray-50 dark:bg-gray-900 rounded p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">环境变量配置：</p>
              <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded block">
                VITE_API_URL=http://localhost:8123
              </code>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

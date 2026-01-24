/**
 * ConfigPage - 配置页面
 *
 * 展示 SettingsContext 的使用示例
 */

import { useState } from 'react';
import { useChat } from '@langgraph-js/sdk/react';
import { useSettings } from '@codegraph/union-client';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';

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
        <Card>
          <CardHeader>
            <CardTitle>当前状态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-agent">当前 Agent</Label>
                <Input
                  id="current-agent"
                  type="text"
                  value={currentAgent}
                  disabled
                  className="bg-gray-50 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  由 ChatProvider 的 defaultAgent 参数控制
                </p>
              </div>

              {currentChatId && (
                <div className="space-y-2">
                  <Label htmlFor="current-chat-id">当前会话 ID</Label>
                  <Input
                    id="current-chat-id"
                    type="text"
                    value={currentChatId}
                    disabled
                    className="bg-gray-50 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 应用配置 - SettingsContext 使用示例 */}
        <Card>
          <CardHeader>
            <CardTitle>应用配置</CardTitle>
          </CardHeader>
          <CardContent>

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
              <div className="space-y-2">
                <Label htmlFor="main-model">主模型</Label>
                <Select
                  value={extraParams.main_model}
                  onValueChange={handleModelChange}
                  disabled={isUpdating}
                >
                  <SelectTrigger id="main-model" className="w-full">
                    <SelectValue placeholder="选择模型" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_MODELS.length === 0 ? (
                      <SelectItem value="none" disabled>无可用模型</SelectItem>
                    ) : (
                      AVAILABLE_MODELS.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name} ({model.provider})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  当前选择: {extraParams.main_model}
                </p>
              </div>

              {/* 思考模式开关 */}
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="thinking-mode"
                  checked={config.enable_thinking ?? true}
                  onCheckedChange={handleThinkingToggle}
                  disabled={isUpdating}
                />
                <div className="space-y-1 leading-none">
                  <Label
                    htmlFor="thinking-mode"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    启用思考模式 (enable_thinking)
                  </Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {config.enable_thinking ? '已启用' : '已禁用'}
                  </p>
                </div>
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
          </CardContent>
        </Card>


      </div>
    </div>
  );
}

import React from 'react';
import { useConfig } from '../hooks/useConfig';

export function ConfigPage() {
  const { config, loading, updateConfig } = useConfig();

  if (loading) return <div>加载中...</div>;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-4">
        <a href="/" className="text-blue-500 hover:underline">
          ← 返回聊天
        </a>
      </div>

      <h1 className="text-3xl font-bold mb-8">配置</h1>

      <div className="space-y-6">
        <section className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-semibold mb-4">模型设置</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                主模型
              </label>
              <input
                type="text"
                value={config?.main_model || ''}
                onChange={(e) => updateConfig({ main_model: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config?.enable_thinking || false}
                  onChange={(e) =>
                    updateConfig({ enable_thinking: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">启用思考模式</span>
              </label>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

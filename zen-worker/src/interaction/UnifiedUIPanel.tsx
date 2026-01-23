/**
 * 统一 UI 面板 (Web 版本)
 *
 * 显示所有待处理的用户交互，使用对应的渲染器渲染
 */

import React, { useMemo } from 'react';
import { useInteractionContext } from './context';
import { rendererRegistry } from './registry';
import type { PanelInteraction } from './types';

/**
 * 单个交互项组件
 */
const InteractionItem: React.FC<{
  interaction: PanelInteraction;
}> = ({ interaction }) => {
  const { updateInteraction } = useInteractionContext();

  // 获取对应的渲染器
  const renderer = rendererRegistry.get(interaction.content.type);

  if (!renderer) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
        <div className="text-red-700">
          ❌ No renderer found for type: {interaction.content.type}
        </div>
      </div>
    );
  }

  // 处理交互变化
  const handleChange = (update: Partial<PanelInteraction>) => {
    updateInteraction(interaction.id, update);
  };

  // 使用渲染器渲染
  return (
    <div key={interaction.id} className="mb-4">
      {renderer.render(interaction as any, handleChange)}
    </div>
  );
};

/**
 * 统一 UI 面板组件
 */
export const UnifiedUIPanel: React.FC = () => {
  const { interactions, clearCompletedInteractions } = useInteractionContext();

  // 只显示待处理的交互
  const pendingInteractions = useMemo(
    () => interactions.filter(i => i.state === 'pending'),
    [interactions]
  );

  if (pendingInteractions.length === 0) {
    return null;
  }

  return (
    <div className="border-2 border-blue-500 rounded-lg p-4 bg-white shadow-lg">
      <div className="flex items-center justify-between mb-4 pb-3 border-b">
        <h2 className="text-lg font-semibold text-gray-700">
          待处理交互 ({pendingInteractions.length})
        </h2>
        <button
          onClick={clearCompletedInteractions}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          清空已完成
        </button>
      </div>

      <div className="space-y-4">
        {pendingInteractions.map(interaction => (
          <InteractionItem key={interaction.id} interaction={interaction} />
        ))}
      </div>
    </div>
  );
};

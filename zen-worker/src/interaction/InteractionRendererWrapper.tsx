/**
 * 交互渲染器包装器
 *
 * 应用默认配置并渲染交互内容
 */

import React, { useMemo } from 'react';
import type { PanelInteraction, InteractionRenderer } from './types';

interface InteractionRendererWrapperProps {
  interaction: PanelInteraction;
  renderer: InteractionRenderer<any>;
  onChange: (updates: Partial<PanelInteraction>) => void;
}

export const InteractionRendererWrapper: React.FC<InteractionRendererWrapperProps> = ({
  interaction,
  renderer,
  onChange,
}) => {
  // 合并默认配置和交互配置（MODIFIED: 直接访问 config，移除可选链）
  const config = useMemo(() => {
    return {
      layout: {
        border: false,
        padding: 0,
        ...renderer.defaultConfig?.layout,
        ...interaction.config.layout,
      },
      interaction: {
        autoSubmit: false,
        allowSkip: false,
        showPreview: true,
        ...renderer.defaultConfig?.interaction,
        ...interaction.config.interaction,
      },
      style: {
        ...renderer.defaultConfig?.style,
        ...interaction.config.style,
      },
    };
  }, [interaction.config, renderer.defaultConfig]);

  // MODIFIED: 传递合并后的 config 给 renderer（对齐 zen-code）
  const enhancedInteraction = useMemo(() => ({
    ...interaction,
    config,
  }), [interaction, config]);

  return (
    <div
      className={`
        ${config.layout.border ? 'border rounded-lg' : ''}
        ${config.style.borderColor ? `border-${config.style.borderColor}` : ''}
        ${config.style.backgroundColor ? `bg-${config.style.backgroundColor}` : ''}
      `}
      style={{
        padding: config.layout.padding ? `${config.layout.padding * 0.25}rem` : undefined,
      }}
    >
      {renderer.render(enhancedInteraction, onChange)}
    </div>
  );
};

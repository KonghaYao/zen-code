/**
 * 交互渲染器包装器
 *
 * 应用默认配置并渲染交互内容
 */

import React, { useMemo } from 'react';
import { Box } from 'ink';
import type { PanelInteraction } from './panel';
import type { InteractionRenderer } from './registry';

/**
 * 渲染器包装器属性
 */
interface InteractionRendererWrapperProps {
    /** 交互对象 */
    interaction: PanelInteraction;
    /** 渲染器 */
    renderer: InteractionRenderer<any>;
    /** 变更回调 */
    onChange: (updates: Partial<PanelInteraction>) => void;
}

/**
 * 交互渲染器包装器组件
 */
export const InteractionRendererWrapper: React.FC<InteractionRendererWrapperProps> = ({
    interaction,
    renderer,
    onChange,
}) => {
    // 合并默认配置和交互配置
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

    const backgroundColor = config.style.backgroundColor;

    return (
        <Box backgroundColor={backgroundColor} paddingX={config.layout.padding} marginBottom={1} flexDirection="column">
            {renderer.render({ ...interaction, config }, onChange)}
        </Box>
    );
};

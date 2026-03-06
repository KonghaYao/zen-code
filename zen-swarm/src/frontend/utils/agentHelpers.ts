/**
 * Agent 相关工具函数
 *
 * 规则引用：js-index-maps, js-early-exit
 */

import type { Agent, Model, Prompt, Middleware } from '../types/index.js';

/**
 * 从 Map 中查找模型名称
 * 规则引用：js-index-maps (O(1) 查找)
 */
export function getModelName(agent: Agent, modelMap: Map<string, Model>): string {
    const model = modelMap.get(agent.model);
    return model ? model.model_name : agent.model;
}

/**
 * 从 Map 中查找提示词名称
 */
export function getPromptName(agent: Agent, promptMap: Map<string, Prompt>): string {
    const prompt = promptMap.get(agent.system_prompt);
    return prompt ? prompt.name : agent.system_prompt;
}

/**
 * 从 Map 中查找中间件名称
 */
export function getMiddlewareName(midId: string, middlewareMap: Map<string, Middleware>): string {
    const mid = middlewareMap.get(midId);
    return mid ? mid.name : midId;
}

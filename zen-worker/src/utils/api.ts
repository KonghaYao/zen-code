/**
 * API 工具函数
 */

import type { ModelConfig } from '@codegraph/union-client';

/**
 * 获取允许的模型列表
 */
export async function fetchAllowedModels(): Promise<ModelConfig[]> {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || new URL('/api', location.href).toString();
    const response = await fetch(`${apiUrl}/models/allowed`);

    if (!response.ok) {
      console.error('Failed to fetch allowed models:', response.statusText);
      return [];
    }

    const data = await response.json();

    return data.data;
  } catch (error) {
    console.error('Error fetching allowed models:', error);
    return [];
  }
}

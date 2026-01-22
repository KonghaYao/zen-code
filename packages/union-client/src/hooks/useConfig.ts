/**
 * useConfig Hook
 * 配置管理 Hook
 */

import { useState, useEffect } from 'react';
import type { UseConfigReturn } from '../types/config.js';

export function useConfig(serverUrl: string = 'http://localhost:8123'): UseConfigReturn {
  const [config, setConfig] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 加载配置
  useEffect(() => {
    async function loadConfig() {
      try {
        setLoading(true);
        const response = await fetch(`${serverUrl}/config`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        setConfig(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, [serverUrl]);

  // 更新配置
  const updateConfig = async (updates: any) => {
    try {
      const response = await fetch(`${serverUrl}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const newConfig = await response.json();
      setConfig(newConfig);
      return newConfig;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return {
    config,
    loading,
    error,
    updateConfig,
  };
}

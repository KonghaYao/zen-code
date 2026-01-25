/**
 * useWindowSize Hook
 * 监听终端窗口大小变化
 * 适用于 TUI 应用
 */

import { useState, useEffect } from 'react';

export interface WindowSize {
  width: number;
  height: number;
}

export function useWindowSize(): WindowSize {
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: process.stdout.columns,
    height: process.stdout.rows,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: process.stdout.columns,
        height: process.stdout.rows,
      });
    };

    process.stdout.on('resize', handleResize);

    return () => {
      process.stdout.off('resize', handleResize);
    };
  }, []);

  return windowSize;
}

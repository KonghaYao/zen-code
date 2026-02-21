/**
 * useLatest hook - 稳定引用最新的值
 *
 * 用途：
 * - 避免在 useEffect/useCallback 的依赖数组中包含变化的对象/函数
 * - 在事件处理器中引用最新的值而不会导致重渲染
 *
 * 规则引用：advanced-use-latest
 */
import { useRef, useEffect } from 'react';

export function useLatest<T>(value: T): { readonly current: T } {
    const ref = useRef(value);

    // 更新 ref.current 为最新值
    useEffect(() => {
        ref.current = value;
    }, [value]);

    return ref;
}

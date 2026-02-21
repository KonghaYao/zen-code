import { Static } from 'ink';
import { Fragment, ReactNode } from 'react';
import { useMemo } from 'react';

export interface PlatformStaticProps<T> {
    items: T[];
    forceStatic?: boolean;
    children: (item: T, index: number) => ReactNode;
}
export const PlatformStatic = function <T>(props: PlatformStaticProps<T>) {
    if (process.platform === 'win32' || props.forceStatic) {
        return <Static {...props}></Static>;
    }
    // 非 Windows 平台：使用 items.length + 随机数 + index 确保全局唯一性
    const keyPrefix = useMemo(
        () => `ps-${props.items.length}-${Math.random().toString(36).substring(2, 9)}`,
        // 仅当 items 长度变化时重新生成 key 前缀
        [props.items.length],
    );
    return (
        <>
            {props.items.map((item, index) => (
                <Fragment key={`${keyPrefix}-${index}`}>{props.children(item, index)}</Fragment>
            ))}
        </>
    );
};

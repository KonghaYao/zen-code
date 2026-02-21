import { Static } from 'ink';
import { ReactNode } from 'react';

export interface PlatformStaticProps<T> {
    items: T[];
    forceStatic?: boolean;
    children: (item: T, index: number) => ReactNode;
}
export const PlatformStatic = function <T>(props: PlatformStaticProps<T>) {
    if (process.platform === 'win32' || props.forceStatic) {
        return <Static {...props}></Static>;
    }
    return <>{props.items.map(props.children)}</>;
};

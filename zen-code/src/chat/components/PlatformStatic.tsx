import { Static } from 'ink';
import { PlatformPath } from 'node:path';
import { JSX, ReactNode } from 'react';

export interface PlatformStaticProps<T> {
    items: T[];
    children: (item: T, index: number) => ReactNode;
}
export const PlatformStatic = function <T>(props: PlatformStaticProps<T>) {
    if (process.platform === 'win32') {
        return <Static {...props}></Static>;
    }
    return <>{props.items.map(props.children)}</>;
};

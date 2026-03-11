import React, { useEffect, useState, useRef, JSX } from 'react';
import { useTimeout } from 'usehooks-ts';

import { clearTerminal } from 'ansi-escapes';
export interface DynamicRendererProps<T = string> {
    staticKey: T;
    children: () => JSX.Element;
    delay?: number;
}

export const DynamicRenderer = <T,>({
    staticKey,
    children,
    delay = 1,
}: DynamicRendererProps<T>): JSX.Element | null => {
    const [visible, setVisible] = useState(true);
    const shouldShowRef = useRef(true);

    useEffect(() => {
        setVisible(false);

        shouldShowRef.current = true;
    }, [staticKey]);

    useTimeout(
        () => {
            if (shouldShowRef.current) {
                // 清理屏幕以更新数据
                // process.stdout.write(clearTerminal);
                setVisible(true);
                shouldShowRef.current = false;
            }
        },
        visible ? null : delay,
    );

    return <>{visible ? children() : null}</>;
};

export default DynamicRenderer;

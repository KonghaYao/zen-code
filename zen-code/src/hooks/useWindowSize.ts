import { useState, useEffect } from 'react';

export const useWindowSize = () => {
    const [windowSize, setWindowSize] = useState({
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
};

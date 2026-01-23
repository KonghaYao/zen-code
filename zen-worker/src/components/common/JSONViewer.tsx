/**
 * JSONViewer - JSON 高亮显示组件
 */

import React from 'react';

interface JSONViewerProps {
    data: any;
    maxDepth?: number;
    initialExpanded?: boolean;
}

const COLORS = {
    string: 'text-cyan-600',
    number: 'text-yellow-600',
    boolean: 'text-purple-600',
    null: 'text-gray-500',
    key: 'text-blue-600',
    bracket: 'text-gray-400',
};

export const JSONViewer: React.FC<JSONViewerProps> = ({
    data,
    maxDepth = 3,
    initialExpanded = true,
}) => {
    const [isExpanded, setIsExpanded] = React.useState(initialExpanded);

    const renderValue = (value: any, depth: number = 0): React.ReactNode => {
        if (depth >= maxDepth) {
            return <span className="text-gray-400">{'{...}'}</span>;
        }

        if (value === null) {
            return <span className={COLORS.null}>null</span>;
        }

        if (typeof value === 'string') {
            return <span className={COLORS.string}>"{value}"</span>;
        }

        if (typeof value === 'number') {
            return <span className={COLORS.number}>{value}</span>;
        }

        if (typeof value === 'boolean') {
            return <span className={COLORS.boolean}>{value.toString()}</span>;
        }

        if (Array.isArray(value)) {
            if (value.length === 0) {
                return <span>[]</span>;
            }

            return (
                <div className="ml-4">
                    <span className={COLORS.bracket}>[</span>
                    {value.map((item, index) => (
                        <div key={index} className="ml-2">
                            <span className={COLORS.bracket}>-</span> {renderValue(item, depth + 1)}
                        </div>
                    ))}
                    <span className={COLORS.bracket}>]</span>
                </div>
            );
        }

        if (typeof value === 'object') {
            const keys = Object.keys(value);
            if (keys.length === 0) {
                return <span>{'{}'}</span>;
            }

            return (
                <div className="ml-4">
                    <span className={COLORS.bracket}>{'{'}</span>
                    {keys.map((key, index) => (
                        <div key={key} className="ml-2">
                            <span className={COLORS.key}>{key}</span>
                            <span className="text-gray-400">: </span>
                            {renderValue(value[key], depth + 1)}
                        </div>
                    ))}
                    <span className={COLORS.bracket}>{'}'}</span>
                </div>
            );
        }

        return String(value);
    };

    const shouldTruncate = (data: any): boolean => {
        if (typeof data === 'string' && data.length > 100) {
            return true;
        }
        if (Array.isArray(data) && data.length > 5) {
            return true;
        }
        if (typeof data === 'object' && data !== null && Object.keys(data).length > 5) {
            return true;
        }
        return false;
    };

    const truncateContent = (data: any): string => {
        if (typeof data === 'string') {
            return data.substring(0, 100) + '...';
        }
        if (Array.isArray(data)) {
            return `[${data.length} items]`;
        }
        if (typeof data === 'object' && data !== null) {
            return `{${Object.keys(data).length} keys}`;
        }
        return String(data);
    };

    return (
        <div className="font-mono text-sm">
            {shouldTruncate(data) ? (
                <div>
                    <code className={isExpanded ? '' : 'text-gray-600'}>
                        {isExpanded ? renderValue(data) : truncateContent(data)}
                    </code>
                    {shouldTruncate(data) && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="ml-2 text-blue-600 hover:text-blue-800 text-xs"
                        >
                            {isExpanded ? '收起' : '展开'}
                        </button>
                    )}
                </div>
            ) : (
                <code>{renderValue(data)}</code>
            )}
        </div>
    );
};

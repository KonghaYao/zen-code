/**
 * DataTable 组件
 *
 * 通用数据表格组件，支持自定义列配置、排序、操作按钮等
 */

import type { ReactNode, Key } from 'react';
import { LoadingSpinner } from '../LoadingSpinner.js';
import { EmptyState } from '../ErrorDisplay.js';

export type EmptyAction = { label: string; onClick: () => void };

export interface TableColumn<T> {
    key: Key;
    title: string;
    width?: string | number;
    align?: 'left' | 'center' | 'right';
    render?: (value: any, record: T, index: number) => ReactNode;
    sortable?: boolean;
}

export interface ActionItem<T = any> {
    key: string;
    label: string;
    danger?: boolean;
    onClick: (record: T, index: number) => void;
    show?: (record: T, index: number) => boolean;
}

export interface DataTableProps<T> {
    columns: TableColumn<T>[];
    dataSource: T[];
    rowKey?: keyof T | ((record: T) => Key);
    loading?: boolean;
    emptyMessage?: string;
    emptyAction?: EmptyAction;
    actions?: ActionItem<T>[];
    onRowClick?: (record: T, index: number) => void;
    size?: 'small' | 'middle' | 'large';
}

export function DataTable<T extends Record<string, any>>({
    columns,
    dataSource,
    rowKey = 'id',
    loading,
    emptyMessage,
    emptyAction,
    actions,
    onRowClick,
    size = 'middle',
}: DataTableProps<T>) {
    if (loading) {
        return <LoadingSpinner />;
    }

    if (dataSource.length === 0) {
        return <EmptyState message={emptyMessage || 'No items found'} action={emptyAction} />;
    }

    const sizeClasses = {
        small: 'text-xs py-2 px-3',
        middle: 'text-sm py-3 px-4',
        large: 'text-base py-4 px-5',
    };

    const getRowKey = (record: T, index: number): Key => {
        if (typeof rowKey === 'function') {
            return rowKey(record);
        }
        return (record[rowKey] as Key) ?? index;
    };

    const getCellValue = (record: T, column: TableColumn<T>, index: number): ReactNode => {
        if (column.render) {
            return column.render(record[column.key as keyof T] as any, record, index);
        }
        return record[column.key as keyof T] as ReactNode;
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse">
                <thead>
                    <tr className="border-b border-border-subtle bg-bg-tertiary">
                        {columns.map((column) => (
                            <th
                                key={column.key}
                                style={{ width: column.width }}
                                className={`text-left font-semibold text-text-secondary ${sizeClasses[size]} ${column.align === 'center' ? 'text-center' : ''} ${column.align === 'right' ? 'text-right' : ''}`}
                            >
                                {column.title}
                            </th>
                        ))}
                        {actions && actions.length > 0 && (
                            <th className={`text-right font-semibold text-text-secondary ${sizeClasses[size]}`}>
                                Actions
                            </th>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {dataSource.map((record, index) => (
                        <tr
                            key={getRowKey(record, index)}
                            className={`border-b border-border-subtle hover:bg-bg-secondary transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                            onClick={() => onRowClick?.(record, index)}
                        >
                            {columns.map((column) => (
                                <td
                                    key={column.key}
                                    className={`${sizeClasses[size]} text-text-primary ${column.align === 'center' ? 'text-center' : ''} ${column.align === 'right' ? 'text-right' : ''}`}
                                >
                                    {getCellValue(record, column, index)}
                                </td>
                            ))}
                            {actions && actions.length > 0 && (
                                <td className={`${sizeClasses[size]} text-right`}>
                                    <div className="flex items-center justify-end gap-2">
                                        {actions.map((action) => {
                                            if (action.show && !action.show(record, index)) {
                                                return null;
                                            }
                                            return (
                                                <button
                                                    key={action.key}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        action.onClick(record, index);
                                                    }}
                                                    className={`text-sm font-medium transition-colors ${action.danger ? 'text-red-600 hover:text-red-700' : 'text-blue-600 hover:text-blue-700'}`}
                                                >
                                                    {action.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

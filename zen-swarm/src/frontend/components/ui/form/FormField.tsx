/**
 * FormField 组件 - 通用表单字段
 *
 * 用途：
 * - 封装表单字段的标签和容器
 * - 提供一致的样式和结构
 * - 支持验证错误显示
 *
 * 规则引用：rerender-hoist-jsx (静态 JSX)
 */

import { ReactNode, useId } from 'react';

interface FormFieldProps {
    label: string;
    required?: boolean;
    error?: string;
    children: ReactNode;
    className?: string;
}

export function FormField(props: FormFieldProps) {
    const { label, required, error, children, className = '' } = props;
    const errorId = useId();

    return (
        <div className={className}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}
                {required && (
                    <span className="text-red-500 ml-1" aria-label="required">
                        *
                    </span>
                )}
            </label>
            {children}
            {error && (
                <p id={errorId} className="mt-1 text-xs text-red-600" role="alert" aria-live="polite">
                    {error}
                </p>
            )}
        </div>
    );
}

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'className'> {
    error?: boolean;
}

export function FormInput(props: InputProps) {
    const { error = false, ...rest } = props;

    return (
        <input
            aria-invalid={error || undefined}
            {...rest}
            className={`w-full px-3 py-2 bg-white border rounded-lg text-gray-900 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed placeholder-gray-400 ${
                error ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
            }`}
        />
    );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    error?: boolean;
}

export function FormTextarea(props: TextareaProps) {
    const { error = false, ...rest } = props;

    return (
        <textarea
            aria-invalid={error || undefined}
            {...rest}
            className={`w-full px-3 py-2 bg-white border rounded-lg text-gray-900 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed placeholder-gray-400 resize-none ${
                error ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
            }`}
        />
    );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    error?: boolean;
    children: ReactNode;
}

export function FormSelect(props: SelectProps) {
    const { error = false, children, ...rest } = props;

    return (
        <select
            aria-invalid={error || undefined}
            {...rest}
            className={`w-full px-3 py-2 bg-white border rounded-lg text-gray-900 cursor-pointer transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed ${
                error ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
            }`}
        >
            {children}
        </select>
    );
}

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'> {
    label: string;
}

export function FormCheckbox(props: CheckboxProps) {
    const { id, label, checked, onChange, ...rest } = props;

    return (
        <label className="flex items-center gap-2 cursor-pointer">
            <input
                type="checkbox"
                id={id}
                checked={checked}
                onChange={onChange}
                className="w-4 h-4 rounded border-gray-300"
                {...rest}
            />
            <span className="text-sm text-gray-700">{label}</span>
        </label>
    );
}

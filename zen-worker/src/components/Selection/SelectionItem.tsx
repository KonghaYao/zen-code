/**
 * SelectionItem - 选择项组件
 *
 * 显示单选/多选选择器和自定义输入
 */

import React, { useState } from 'react';

export interface SelectionOption {
    label: string;
    value: string;
    description?: string;
}

export interface SelectionItemProps {
    title?: string;
    description?: string;
    options: SelectionOption[];
    singleSelect?: boolean;
    maxSelections?: number;
    allowCustomInput?: boolean;
    placeholder?: string;
    onSubmit: (result: { selected: string[]; customInput: string }) => void;
}

export const SelectionItem: React.FC<SelectionItemProps> = ({
    title,
    description,
    options,
    singleSelect = false,
    maxSelections,
    allowCustomInput = false,
    placeholder = '输入自定义内容...',
    onSubmit,
}) => {
    const [selected, setSelected] = useState<string[]>([]);
    const [customInput, setCustomInput] = useState('');
    const [hasSubmitted, setHasSubmitted] = useState(false);

    const handleSubmit = () => {
        if (hasSubmitted) return;
        setHasSubmitted(true);
        onSubmit({ selected, customInput });
    };

    const handleOptionClick = (value: string) => {
        if (hasSubmitted) return;

        if (singleSelect) {
            setSelected([value]);
        } else {
            if (selected.includes(value)) {
                setSelected(selected.filter(v => v !== value));
            } else {
                if (maxSelections && selected.length >= maxSelections) {
                    return; // 达到最大选择数
                }
                setSelected([...selected, value]);
            }
        }
    };

    return (
        <div className="bg-cyan-50 border-l-4 border-cyan-500 p-4 rounded">
            {/* 标题和描述 */}
            {title && (
                <div className="mb-3">
                    <div className="text-cyan-700 font-medium text-lg">
                        {title}
                    </div>
                </div>
            )}
            {description && (
                <div className="mb-3">
                    <div className="text-gray-600 text-sm">
                        {description}
                    </div>
                </div>
            )}

            {/* 选项列表 */}
            {options.length > 0 && (
                <div className="mt-3 space-y-2">
                    {options.map((opt, idx) => {
                        const isSelected = selected.includes(opt.value);

                        return (
                            <button
                                key={idx}
                                onClick={() => handleOptionClick(opt.value)}
                                disabled={hasSubmitted}
                                className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                                    isSelected
                                        ? 'bg-cyan-500 text-white border-2 border-cyan-600 shadow-md'
                                        : 'bg-white text-gray-700 border-2 border-gray-200 hover:bg-cyan-50 hover:border-cyan-300'
                                } ${hasSubmitted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">{opt.label}</span>
                                    {isSelected && (
                                        <span className="text-xl">✓</span>
                                    )}
                                </div>
                                {opt.description && (
                                    <div className={`text-sm mt-1 ${isSelected ? 'text-cyan-100' : 'text-gray-500'}`}>
                                        {opt.description}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* 自定义输入 */}
            {allowCustomInput && (
                <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        自定义输入（可选）
                    </label>
                    <textarea
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        placeholder={placeholder}
                        disabled={hasSubmitted}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm disabled:bg-gray-100"
                        rows={3}
                    />
                </div>
            )}

            {/* 提交按钮 */}
            <div className="mt-4 flex gap-2">
                <button
                    onClick={handleSubmit}
                    disabled={!selected.length && !customInput.trim() || hasSubmitted}
                    className="px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    {hasSubmitted ? '已提交' : '确认选择'}
                </button>
            </div>

            {/* 提示 */}
            <div className="mt-2 text-xs text-gray-500">
                💡 {singleSelect ? '单选模式' : '多选模式'} - {allowCustomInput ? '支持自定义输入' : '仅限预设选项'}
            </div>
        </div>
    );
};

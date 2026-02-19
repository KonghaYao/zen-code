/**
 * Select Component - 可靠的下拉选择组件
 * 解决 Bun 环境下原生 select 的事件处理问题
 */

import React, { useState, useRef, useEffect } from 'react';

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

interface SelectProps {
    value?: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    loading?: boolean;
    loadingText?: string;
}

export const Select: React.FC<SelectProps> = ({
    value = '',
    onChange,
    options,
    placeholder = 'Select...',
    disabled = false,
    className = '',
    loading = false,
    loadingText = 'Loading...',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const selectRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const selectedOption = options.find((opt) => opt.value === value);
    const displayValue = selectedOption?.label || placeholder;

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!isOpen) return;

            switch (event.key) {
                case 'ArrowDown':
                    event.preventDefault();
                    setHighlightedIndex((prev) => {
                        const validOptions = options.filter((opt) => !opt.disabled);
                        const newIndex = Math.min(prev + 1, validOptions.length - 1);
                        return newIndex;
                    });
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    setHighlightedIndex((prev) => {
                        const newIndex = Math.max(prev - 1, 0);
                        return newIndex;
                    });
                    break;
                case 'Enter':
                case ' ':
                    event.preventDefault();
                    if (highlightedIndex >= 0) {
                        const validOptions = options.filter((opt) => !opt.disabled);
                        const option = validOptions[highlightedIndex];
                        if (option) {
                            onChange(option.value);
                            setIsOpen(false);
                        }
                    }
                    break;
                case 'Escape':
                    setIsOpen(false);
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, highlightedIndex, options, onChange]);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    if (loading) {
        return (
            <div className={`px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-400 ${className}`}>
                {loadingText}
            </div>
        );
    }

    const validOptions = options.filter((opt) => !opt.disabled);

    return (
        <div ref={selectRef} className="relative">
            {/* Trigger Button */}
            <button
                ref={buttonRef}
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`
                    w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg
                    text-left text-white focus:outline-none focus:ring-2 focus:ring-blue-500
                    disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed
                    flex items-center justify-between
                    ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
                    ${className}
                `}
            >
                <span className={value ? 'text-white' : 'text-gray-400'}>{displayValue}</span>
                <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {validOptions.length === 0 ? (
                        <div className="px-3 py-2 text-gray-500 text-sm">No options available</div>
                    ) : (
                        validOptions.map((option, index) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => handleSelect(option.value)}
                                className={`
                                    w-full px-3 py-2 text-left text-sm transition-colors
                                    ${option.value === value ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}
                                    ${index === highlightedIndex ? 'bg-gray-700' : ''}
                                `}
                            >
                                {option.label}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

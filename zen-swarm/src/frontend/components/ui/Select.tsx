/**
 * Select Component - 可靠的下拉选择组件
 * 解决 Bun 环境下原生 select 的事件处理问题
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from './Icons.js';

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

    const highlightedIndexRef = useRef(highlightedIndex);
    highlightedIndexRef.current = highlightedIndex;
    const optionsRef = useRef(options);
    optionsRef.current = options;
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

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
                        const validOptions = optionsRef.current.filter((opt) => !opt.disabled);
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
                    if (highlightedIndexRef.current >= 0) {
                        const validOptions = optionsRef.current.filter((opt) => !opt.disabled);
                        const option = validOptions[highlightedIndexRef.current];
                        if (option) {
                            onChangeRef.current(option.value);
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
    }, [isOpen]);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    if (loading) {
        return (
            <div className={`px-3 py-2 bg-white border border-border-subtle rounded-lg text-text-muted ${className}`}>
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
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-disabled={disabled}
                className={`
                    w-full px-3 py-2 bg-white border rounded-lg
                    text-left text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 transition-colors duration-150
                    disabled:bg-bg-tertiary disabled:text-text-tertiary disabled:cursor-not-allowed
                    flex items-center justify-between cursor-pointer
                    ${isOpen ? 'border-primary' : 'border-border-default hover:border-border-strong'}
                    ${className}
                `}
            >
                <span className={value ? 'text-text-primary' : 'text-text-muted'}>{displayValue}</span>
                <ChevronDown
                    className={`w-4 h-4 text-text-muted transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    role="listbox"
                    aria-label="Options"
                    className="absolute z-50 w-full mt-1 bg-white border border-border-subtle rounded-lg shadow-lg max-h-60 overflow-y-auto"
                >
                    {validOptions.length === 0 ? (
                        <div className="px-3 py-2 text-text-muted text-sm">No options available</div>
                    ) : (
                        validOptions.map((option, index) => (
                            <button
                                key={option.value}
                                type="button"
                                role="option"
                                aria-selected={option.value === value}
                                onClick={() => handleSelect(option.value)}
                                className={`
                                    w-full px-3 py-2 text-left text-sm transition-colors duration-100 cursor-pointer
                                    focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary
                                    ${
                                        option.value === value
                                            ? 'bg-primary-light text-primary-dark font-medium'
                                            : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                                    }
                                    ${index === highlightedIndex && option.value !== value ? 'bg-bg-tertiary text-text-primary' : ''}
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

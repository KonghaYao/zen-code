/**
 * 选择渲染器 (Web 版本)
 * 渲染选择类型的交互内容
 */

import React, { useState } from 'react';
import type { InteractionRenderer } from '../types';
import type { SelectionContent } from '../content';
import type { PanelInteraction } from '../types';

/**
 * 选择渲染器实现
 */
export const SelectionRenderer: InteractionRenderer<SelectionContent> = {
  type: 'selection',

  /**
   * 渲染选择交互
   */
  render(interaction: PanelInteraction & { content: SelectionContent }, onChange) {
    const { content, metadata } = interaction;
    const [selected, setSelected] = useState<string[]>([]);
    const [customInput, setCustomInput] = useState('');
    const [hasSubmitted, setHasSubmitted] = useState(false);

    const options = content.options.map(opt => ({
      label: opt.label,
      value: opt.value,
      description: opt.description,
    }));

    const handleSubmit = () => {
      if (hasSubmitted) return;
      setHasSubmitted(true);

      onChange({
        state: 'submitted',
        result: {
          status: 'selected',
          selected,
          customInput,
        },
      });
    };

    const handleOptionClick = (value: string) => {
      if (hasSubmitted) return;

      if (content.singleSelect) {
        setSelected([value]);
      } else {
        if (selected.includes(value)) {
          setSelected(selected.filter(v => v !== value));
        } else {
          if (content.maxSelections && selected.length >= content.maxSelections) {
            return; // 达到最大选择数
          }
          setSelected([...selected, value]);
        }
      }
    };

    return (
      <div className="bg-cyan-50 border-l-4 border-cyan-500 p-4 rounded">
        {/* 标题和描述 */}
        {metadata?.title && (
          <div className="mb-3">
            <div className="text-cyan-700 font-medium text-lg">
              {metadata.title}
            </div>
          </div>
        )}
        {metadata?.description && (
          <div className="mb-3">
            <div className="text-gray-600 text-sm">
              {metadata.description}
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
        {content.allowCustomInput && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              自定义输入（可选）
            </label>
            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder={content.placeholder || '输入自定义内容...'}
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
          💡 {content.singleSelect ? '单选模式' : '多选模式'} - {content.allowCustomInput ? '支持自定义输入' : '仅限预设选项'}
        </div>
      </div>
    );
  },

  /**
   * 验证函数
   */
  validate(content: SelectionContent): string | undefined {
    if (content.options.length === 0) {
      return 'At least one option is required';
    }
    if (content.singleSelect && content.maxSelections && content.maxSelections > 1) {
      return 'Single select cannot have maxSelections > 1';
    }
    return undefined;
  },

  /**
   * 默认配置
   */
  defaultConfig: {
    layout: {
      border: true,
      padding: 1,
    },
    interaction: {
      autoSubmit: false,
    },
  },
};

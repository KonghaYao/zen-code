/**
 * useUnifiedAutocomplete Hook Tests
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUnifiedAutocomplete } from './useUnifiedAutocomplete.js';
import type { AutocompleteItem } from './useUnifiedAutocomplete.js';

// Mock data
const mockCommands: AutocompleteItem[] = [
    { id: 'help', name: 'help', displayText: '/help', description: '显示帮助信息' },
    { id: 'history', name: 'history', displayText: '/history', description: '查看历史记录' },
    { id: 'model', name: 'model', displayText: '/model', description: '切换模型' },
    { id: 'clear', name: 'clear', displayText: '/clear', description: '清空对话' },
    { id: 'compact', name: 'compact', displayText: '/compact', description: '压缩对话' },
];

const mockSkills: AutocompleteItem[] = [
    { id: 'web-research', name: 'web-research', displayText: '#web-research', description: '网络研究' },
    { id: 'tanstack-query', name: 'tanstack-query', displayText: '#tanstack-query', description: 'TanStack Query' },
    { id: 'web-design', name: 'web-design', displayText: '#web-design', description: '网页设计指南' },
    { id: 'codebase-exploration', name: 'codebase-exploration', displayText: '#codebase-exploration' },
];

const mockAgents: AutocompleteItem[] = [
    { id: 'default', name: 'default', displayText: '@default', description: '代码实现助手' },
    { id: 'manager', name: 'manager', displayText: '@manager', description: '任务管理员' },
    { id: 'research', name: 'research', displayText: '@research', description: '研究助手' },
];

describe('useUnifiedAutocomplete', () => {
    // ==================== 基础功能 ====================
    describe('trigger detection', () => {
        it('should detect command trigger /', () => {
            const { result } = renderHook(() =>
                useUnifiedAutocomplete({
                    commands: mockCommands,
                    skills: mockSkills,
                    agents: mockAgents,
                }),
            );

            act(() => {
                result.current.checkTrigger('/hel');
            });

            expect(result.current.state.visible).toBe(true);
            expect(result.current.state.type).toBe('command');
            expect(result.current.state.query).toBe('hel');
        });

        it('should detect skill trigger #', () => {
            const { result } = renderHook(() =>
                useUnifiedAutocomplete({
                    commands: mockCommands,
                    skills: mockSkills,
                    agents: mockAgents,
                }),
            );

            act(() => {
                result.current.checkTrigger('#web');
            });

            expect(result.current.state.visible).toBe(true);
            expect(result.current.state.type).toBe('skill');
            expect(result.current.state.query).toBe('web');
        });

        it('should detect agent trigger @', () => {
            const { result } = renderHook(() =>
                useUnifiedAutocomplete({
                    commands: mockCommands,
                    skills: mockSkills,
                    agents: mockAgents,
                }),
            );

            act(() => {
                result.current.checkTrigger('@man');
            });

            expect(result.current.state.visible).toBe(true);
            expect(result.current.state.type).toBe('agent');
            expect(result.current.state.query).toBe('man');
        });

        it('should not trigger in middle of word', () => {
            const { result } = renderHook(() =>
                useUnifiedAutocomplete({
                    commands: mockCommands,
                    skills: mockSkills,
                    agents: mockAgents,
                }),
            );

            act(() => {
                result.current.checkTrigger('test#web');
            });

            expect(result.current.state.visible).toBe(false);
        });

        it('should trigger after whitespace', () => {
            const { result } = renderHook(() =>
                useUnifiedAutocomplete({
                    commands: mockCommands,
                    skills: mockSkills,
                    agents: mockAgents,
                }),
            );

            act(() => {
                result.current.checkTrigger('hello #web');
            });

            expect(result.current.state.visible).toBe(true);
            expect(result.current.state.type).toBe('skill');
        });

        it('should trigger after newline', () => {
            const { result } = renderHook(() =>
                useUnifiedAutocomplete({
                    commands: mockCommands,
                    skills: mockSkills,
                    agents: mockAgents,
                }),
            );

            act(() => {
                result.current.checkTrigger('hello\n@def');
            });

            expect(result.current.state.visible).toBe(true);
            expect(result.current.state.type).toBe('agent');
        });
    });

    // ==================== 过滤功能 ====================
    describe('filtering', () => {
        it('should filter commands by prefix', () => {
            const { result } = renderHook(() =>
                useUnifiedAutocomplete({
                    commands: mockCommands,
                    skills: mockSkills,
                    agents: mockAgents,
                }),
            );

            act(() => {
                result.current.checkTrigger('/h');
            });

            expect(result.current.state.items).toHaveLength(2); // help, history
            expect(result.current.state.items[0].id).toBe('help');
        });

        it('should filter skills with fuzzy matching', () => {
            const { result } = renderHook(() =>
                useUnifiedAutocomplete({
                    commands: mockCommands,
                    skills: mockSkills,
                    agents: mockAgents,
                }),
            );

            act(() => {
                result.current.checkTrigger('#web');
            });

            // Should match web-research and web-design
            expect(result.current.state.items.length).toBeGreaterThanOrEqual(2);
        });

        it('should filter agents by name/id', () => {
            const { result } = renderHook(() =>
                useUnifiedAutocomplete({
                    commands: mockCommands,
                    skills: mockSkills,
                    agents: mockAgents,
                }),
            );

            act(() => {
                result.current.checkTrigger('@man');
            });

            expect(result.current.state.items).toHaveLength(1);
            expect(result.current.state.items[0].id).toBe('manager');
        });

        it('should limit results to maxVisible', () => {
            const { result } = renderHook(() =>
                useUnifiedAutocomplete({
                    commands: mockCommands,
                    skills: mockSkills,
                    agents: mockAgents,
                    maxVisible: 2,
                }),
            );

            act(() => {
                result.current.checkTrigger('/'); // Show all commands
            });

            expect(result.current.state.items.length).toBeLessThanOrEqual(2);
        });
    });

    // ==================== 导航功能 ====================
    describe('navigation', () => {
        it('should select next item on downArrow', () => {
            const { result } = renderHook(() =>
                useUnifiedAutocomplete({
                    commands: mockCommands,
                    skills: mockSkills,
                    agents: mockAgents,
                }),
            );

            act(() => {
                result.current.checkTrigger('/h');
            });

            expect(result.current.state.selectedIndex).toBe(0);

            act(() => {
                result.current.selectNext();
            });

            expect(result.current.state.selectedIndex).toBe(1);
        });

        it('should select prev item on upArrow', () => {
            const { result } = renderHook(() =>
                useUnifiedAutocomplete({
                    commands: mockCommands,
                    skills: mockSkills,
                    agents: mockAgents,
                }),
            );

            act(() => {
                result.current.checkTrigger('/h');
            });

            // Start at 0, go to 1
            act(() => {
                result.current.selectNext();
            });
            expect(result.current.state.selectedIndex).toBe(1);

            // Go back to 0
            act(() => {
                result.current.selectPrev();
            });
            expect(result.current.state.selectedIndex).toBe(0);
        });

        it('should wrap around when navigating (last → first)', () => {
            const { result } = renderHook(() =>
                useUnifiedAutocomplete({
                    commands: mockCommands,
                    skills: mockSkills,
                    agents: mockAgents,
                }),
            );

            act(() => {
                result.current.checkTrigger('/h');
            });

            // At index 0, go prev should wrap to last
            act(() => {
                result.current.selectPrev();
            });

            expect(result.current.state.selectedIndex).toBe(result.current.state.items.length - 1);
        });

        it('should wrap around when navigating (first → last)', () => {
            const { result } = renderHook(() =>
                useUnifiedAutocomplete({
                    commands: mockCommands,
                    skills: mockSkills,
                    agents: mockAgents,
                }),
            );

            act(() => {
                result.current.checkTrigger('/h');
            });

            const lastIndex = result.current.state.items.length - 1;

            // Go to last item
            act(() => {
                result.current.state.selectedIndex = lastIndex;
            });

            // Next should wrap to first
            act(() => {
                result.current.selectNext();
            });

            expect(result.current.state.selectedIndex).toBe(0);
        });

        it('should start with selectedIndex = 0', () => {
            const { result } = renderHook(() =>
                useUnifiedAutocomplete({
                    commands: mockCommands,
                    skills: mockSkills,
                    agents: mockAgents,
                }),
            );

            act(() => {
                result.current.checkTrigger('/h');
            });

            expect(result.current.state.selectedIndex).toBe(0);
        });
    });

    // ==================== 补全功能 ====================
    describe('completion', () => {
        it('should complete with selected item', () => {
            const { result } = renderHook(() =>
                useUnifiedAutocomplete({
                    commands: mockCommands,
                    skills: mockSkills,
                    agents: mockAgents,
                }),
            );

            act(() => {
                result.current.checkTrigger('/h');
            });

            const completed = result.current.complete('/h');
            expect(completed).toBe('/help ');
        });

        it('should complete at correct position', () => {
            const { result } = renderHook(() =>
                useUnifiedAutocomplete({
                    commands: mockCommands,
                    skills: mockSkills,
                    agents: mockAgents,
                }),
            );

            act(() => {
                result.current.checkTrigger('hello #web');
            });

            // First item should be web-research (fuzzy match)
            const firstItem = result.current.state.items[0];
            expect(firstItem?.name).toContain('web');

            // Complete with first item
            const completed = result.current.complete('hello #web');
            expect(completed).toContain('web');
            expect(completed).toContain('hello');
        });

        it('should return original input when no selection', () => {
            const { result } = renderHook(() =>
                useUnifiedAutocomplete({
                    commands: mockCommands,
                    skills: mockSkills,
                    agents: mockAgents,
                }),
            );

            // No trigger, no autocomplete
            const completed = result.current.complete('hello world');
            expect(completed).toBe('hello world');
        });
    });

    // ==================== 边界情况 ====================
    describe('edge cases', () => {
        it('should hide when query exactly matches item name', () => {
            const { result } = renderHook(() =>
                useUnifiedAutocomplete({
                    commands: mockCommands,
                    skills: mockSkills,
                    agents: mockAgents,
                }),
            );

            act(() => {
                result.current.checkTrigger('#web-research');
            });

            expect(result.current.state.visible).toBe(false);
        });

        it('should handle empty item lists', () => {
            const { result } = renderHook(() =>
                useUnifiedAutocomplete({
                    commands: [],
                    skills: [],
                    agents: [],
                }),
            );

            act(() => {
                result.current.checkTrigger('/help');
            });

            expect(result.current.state.visible).toBe(false);
            expect(result.current.state.items).toHaveLength(0);
        });

        it('should handle switching trigger types', () => {
            const { result } = renderHook(() =>
                useUnifiedAutocomplete({
                    commands: mockCommands,
                    skills: mockSkills,
                    agents: mockAgents,
                }),
            );

            // First trigger command
            act(() => {
                result.current.checkTrigger('/h');
            });
            expect(result.current.state.type).toBe('command');

            // Switch to skill
            act(() => {
                result.current.checkTrigger('#web');
            });
            expect(result.current.state.type).toBe('skill');
            expect(result.current.state.selectedIndex).toBe(0); // Reset to 0
        });

        it('should preserve text after completion', () => {
            const { result } = renderHook(() =>
                useUnifiedAutocomplete({
                    commands: mockCommands,
                    skills: mockSkills,
                    agents: mockAgents,
                }),
            );

            act(() => {
                result.current.checkTrigger('#web more text');
            });

            const completed = result.current.complete('#web more text');
            expect(completed).toContain('more text');
        });
    });

    // ==================== handleKeyDown ====================
    describe('handleKeyDown', () => {
        it('should return false for unhandled keys when inactive', () => {
            const { result } = renderHook(() =>
                useUnifiedAutocomplete({
                    commands: mockCommands,
                    skills: mockSkills,
                    agents: mockAgents,
                }),
            );

            const handled = result.current.handleKeyDown({ upArrow: true });
            expect(handled).toBe(false);
        });

        it('should handle upArrow when active', () => {
            const { result } = renderHook(() =>
                useUnifiedAutocomplete({
                    commands: mockCommands,
                    skills: mockSkills,
                    agents: mockAgents,
                }),
            );

            act(() => {
                result.current.checkTrigger('/h');
            });

            const handled = result.current.handleKeyDown({ upArrow: true });
            expect(handled).toBe(true);
        });

        it('should handle downArrow when active', () => {
            const { result } = renderHook(() =>
                useUnifiedAutocomplete({
                    commands: mockCommands,
                    skills: mockSkills,
                    agents: mockAgents,
                }),
            );

            act(() => {
                result.current.checkTrigger('/h');
            });

            const handled = result.current.handleKeyDown({ downArrow: true });
            expect(handled).toBe(true);
        });

        it('should handle escape when active', () => {
            const { result } = renderHook(() =>
                useUnifiedAutocomplete({
                    commands: mockCommands,
                    skills: mockSkills,
                    agents: mockAgents,
                }),
            );

            act(() => {
                result.current.checkTrigger('/h');
            });

            act(() => {
                const handled = result.current.handleKeyDown({ escape: true });
                expect(handled).toBe(true);
            });
            expect(result.current.state.visible).toBe(false);
        });
    });
});

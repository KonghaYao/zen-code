/**
 * Tests for useSkillAutocomplete hook
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSkillAutocomplete } from './useSkillAutocomplete';
import type { Skill } from '@codegraph/config';

const mockSkills: Skill[] = [
    { name: 'web-research', description: 'Research latest developments', path: '/skills/web-research' },
    { name: 'tanstack-query', description: 'Manage server state in React', path: '/skills/tanstack-query' },
    { name: 'find-skills', description: 'Discover and install agent skills', path: '/skills/find-skills' },
    { name: 'skill-creator', description: 'Guide for creating effective skills', path: '/skills/skill-creator' },
    { name: 'brainstorming', description: 'Use before any creative work', path: '/skills/brainstorming' },
    { name: 'langgraph-development', description: 'Building agents with LangGraph', path: '/skills/langgraph' },
];

describe('useSkillAutocomplete', () => {
    it('should have initial hidden state', () => {
        const { result } = renderHook(() => useSkillAutocomplete({ skills: mockSkills }));

        expect(result.current.state.visible).toBe(false);
        expect(result.current.isActive).toBe(false);
    });

    it('should show suggestions when # is typed', () => {
        const { result } = renderHook(() => useSkillAutocomplete({ skills: mockSkills }));

        act(() => {
            result.current.checkTrigger('#');
        });

        expect(result.current.state.visible).toBe(true);
        expect(result.current.state.query).toBe('');
        expect(result.current.state.filteredSkills.length).toBeGreaterThan(0);
    });

    it('should filter skills by fuzzy match', () => {
        const { result } = renderHook(() => useSkillAutocomplete({ skills: mockSkills }));

        act(() => {
            result.current.checkTrigger('#web');
        });

        expect(result.current.state.visible).toBe(true);
        expect(result.current.state.query).toBe('web');
        // FuzzyMatch structure: { skill, result }
        expect(result.current.state.filteredSkills).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ skill: expect.objectContaining({ name: 'web-research' }) }),
            ]),
        );
    });

    it('should be case-insensitive', () => {
        const { result } = renderHook(() => useSkillAutocomplete({ skills: mockSkills }));

        act(() => {
            result.current.checkTrigger('#WEB');
        });

        expect(result.current.state.filteredSkills).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ skill: expect.objectContaining({ name: 'web-research' }) }),
            ]),
        );
    });

    it('should limit suggestions to maxSuggestions', () => {
        const { result } = renderHook(() =>
            useSkillAutocomplete({
                skills: mockSkills,
                maxSuggestions: 2,
            }),
        );

        act(() => {
            result.current.checkTrigger('#');
        });

        expect(result.current.state.filteredSkills.length).toBeLessThanOrEqual(2);
    });

    it('should not trigger in middle of word', () => {
        const { result } = renderHook(() => useSkillAutocomplete({ skills: mockSkills }));

        act(() => {
            result.current.checkTrigger('test#web');
        });

        expect(result.current.state.visible).toBe(false);
    });

    it('should trigger after whitespace', () => {
        const { result } = renderHook(() => useSkillAutocomplete({ skills: mockSkills }));

        act(() => {
            result.current.checkTrigger('hello #web');
        });

        expect(result.current.state.visible).toBe(true);
        expect(result.current.state.query).toBe('web');
    });

    it('should get first skill', () => {
        const { result } = renderHook(() => useSkillAutocomplete({ skills: mockSkills }));

        act(() => {
            result.current.checkTrigger('#web');
        });

        const firstSkill = result.current.getFirstSkill();
        expect(firstSkill).not.toBeNull();
        expect(firstSkill!.name).toBe('web-research');
    });

    it('should complete skill name with first match', () => {
        const { result } = renderHook(() => useSkillAutocomplete({ skills: mockSkills }));

        act(() => {
            result.current.checkTrigger('#web');
        });

        let completedText: string = '';
        act(() => {
            completedText = result.current.complete('#web');
        });

        expect(completedText).toBe('#web-research ');
    });

    it('should hide autocomplete', () => {
        const { result } = renderHook(() => useSkillAutocomplete({ skills: mockSkills }));

        act(() => {
            result.current.checkTrigger('#web');
        });

        expect(result.current.state.visible).toBe(true);

        act(() => {
            result.current.hide();
        });

        expect(result.current.state.visible).toBe(false);
        expect(result.current.isActive).toBe(false);
    });

    it('should handle empty skills list', () => {
        const { result } = renderHook(() => useSkillAutocomplete({ skills: [] }));

        act(() => {
            result.current.checkTrigger('#');
        });

        expect(result.current.state.visible).toBe(true);
        // With fuzzy search, empty skills list returns empty array
        expect(result.current.state.filteredSkills).toEqual([]);
        expect(result.current.isActive).toBe(false);
    });

    it('should handle no matching skills', () => {
        const { result } = renderHook(() => useSkillAutocomplete({ skills: mockSkills }));

        act(() => {
            result.current.checkTrigger('#nonexistent');
        });

        expect(result.current.state.visible).toBe(true);
        // With fuzzy search, no match returns empty array
        expect(result.current.state.filteredSkills).toEqual([]);
        expect(result.current.isActive).toBe(false);
    });

    it('should find last # in input', () => {
        const { result } = renderHook(() => useSkillAutocomplete({ skills: mockSkills }));

        act(() => {
            result.current.checkTrigger('#web #find');
        });

        expect(result.current.state.query).toBe('find');
    });

    it('should complete at correct position', () => {
        const { result } = renderHook(() => useSkillAutocomplete({ skills: mockSkills }));

        act(() => {
            result.current.checkTrigger('hello #web world');
        });

        // Should replace #web at its position
        // Implementation uses trimStart() on afterQuery to avoid double-space
        const completedText = result.current.complete('hello #web world');
        expect(completedText).toBe('hello #web-research world');
    });

    it('should return null for getFirstSkill when not active', () => {
        const { result } = renderHook(() => useSkillAutocomplete({ skills: mockSkills }));

        const firstSkill = result.current.getFirstSkill();
        expect(firstSkill).toBeNull();
    });

    it('should return original input when completing with no match', () => {
        const { result } = renderHook(() => useSkillAutocomplete({ skills: mockSkills }));

        act(() => {
            result.current.checkTrigger('#nonexistent');
        });

        const completedText = result.current.complete('#nonexistent');
        expect(completedText).toBe('#nonexistent');
    });

    it('should hide autocomplete when query exactly matches skill name', () => {
        const { result } = renderHook(() => useSkillAutocomplete({ skills: mockSkills }));

        // Start with partial match
        act(() => {
            result.current.checkTrigger('#web');
        });

        expect(result.current.state.visible).toBe(true);

        // Complete to full skill name
        act(() => {
            result.current.checkTrigger('#web-research');
        });

        // Should hide when exact match
        expect(result.current.state.visible).toBe(false);
    });

    // Fuzzy search specific tests
    it('should match fuzzy patterns in skill names', () => {
        const { result } = renderHook(() => useSkillAutocomplete({ skills: mockSkills }));

        // 'wr' should match 'web-research' (w...r...)
        act(() => {
            result.current.checkTrigger('#wr');
        });

        expect(result.current.state.visible).toBe(true);
        expect(result.current.state.filteredSkills.length).toBeGreaterThan(0);
        // web-research should be in the results
        const matchedNames = result.current.state.filteredSkills.map((f) => f.skill.name);
        expect(matchedNames).toContain('web-research');
    });

    it('should match characters in order with gaps', () => {
        const { result } = renderHook(() => useSkillAutocomplete({ skills: mockSkills }));

        // 'tg' should match 'tanstack-query' (t...g... - actually tanstack-query doesn't have g after t)
        // Let's use 'tq' which should match 'tanstack-query' (t...q...)
        act(() => {
            result.current.checkTrigger('#tq');
        });

        expect(result.current.state.visible).toBe(true);
        const matchedNames = result.current.state.filteredSkills.map((f) => f.skill.name);
        expect(matchedNames).toContain('tanstack-query');
    });

    it('should include fuzzy result for highlighting', () => {
        const { result } = renderHook(() => useSkillAutocomplete({ skills: mockSkills }));

        act(() => {
            result.current.checkTrigger('#web');
        });

        // Each filtered skill should have a result object for highlighting
        expect(result.current.state.filteredSkills[0]).toHaveProperty('skill');
        expect(result.current.state.filteredSkills[0]).toHaveProperty('result');
    });
});

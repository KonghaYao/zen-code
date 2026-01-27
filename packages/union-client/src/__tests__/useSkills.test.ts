import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSkills } from '../hooks/useSkills.js';
import type { ConfigManager } from '@codegraph/config';
import type { Skill, SkillContent } from '@codegraph/config';

// Mock ConfigManager
const mockManager = {
  listSkills: vi.fn(),
  getSkill: vi.fn(),
  saveSkill: vi.fn(),
  deleteSkill: vi.fn(),
} as unknown as ConfigManager;

describe('useSkills', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return empty skills when manager is null', async () => {
      const { result } = renderHook(() => useSkills(null));

      expect(result.current.loading).toBe(false);
      expect(result.current.skills).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should load skills on mount', async () => {
      const mockSkills: Skill[] = [
        { name: 'skill1', description: 'Skill 1', path: '/path/to/skill1' },
        { name: 'skill2', description: 'Skill 2', path: '/path/to/skill2' },
      ];
      vi.mocked(mockManager.listSkills).mockResolvedValue(mockSkills);

      const { result } = renderHook(() => useSkills(mockManager));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockManager.listSkills).toHaveBeenCalledOnce();
      expect(result.current.skills).toEqual(mockSkills);
      expect(result.current.error).toBeNull();
    });

    it('should handle errors during load', async () => {
      const error = new Error('Failed to load skills');
      vi.mocked(mockManager.listSkills).mockRejectedValue(error);

      const { result } = renderHook(() => useSkills(mockManager));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('getSkill', () => {
    it('should get skill content', async () => {
      const mockContent: SkillContent = {
        frontmatter: { description: 'Test Skill' },
        markdown: '# Test Skill\n\nContent here',
      };
      vi.mocked(mockManager.getSkill).mockResolvedValue(mockContent);

      const { result } = renderHook(() => useSkills(mockManager));

      let content: SkillContent | null = null;
      await act(async () => {
        content = await result.current.getSkill('test-skill');
      });

      expect(mockManager.getSkill).toHaveBeenCalledWith('test-skill');
      expect(content).toEqual(mockContent);
    });

    it('should throw error when manager is null', async () => {
      const { result } = renderHook(() => useSkills(null));

      await expect(result.current.getSkill('test-skill')).rejects.toThrow(
        'ConfigManager not initialized'
      );
    });

    it('should throw error on getSkill failure', async () => {
      const error = new Error('Skill not found');
      vi.mocked(mockManager.getSkill).mockRejectedValue(error);

      const { result } = renderHook(() => useSkills(mockManager));

      await expect(result.current.getSkill('test-skill')).rejects.toThrow(
        'Failed to get skill "test-skill": Skill not found'
      );
    });
  });

  describe('saveSkill', () => {
    it('should save skill and reload list', async () => {
      const mockSkills: Skill[] = [
        { name: 'skill1', description: 'Skill 1', path: '/path/to/skill1' },
      ];
      const mockContent: SkillContent = {
        frontmatter: { description: 'New Skill' },
        markdown: '# New Skill',
      };

      vi.mocked(mockManager.listSkills).mockResolvedValue(mockSkills);
      vi.mocked(mockManager.saveSkill).mockResolvedValue(undefined);

      const { result } = renderHook(() => useSkills(mockManager));

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Save skill
      await act(async () => {
        await result.current.saveSkill('new-skill', mockContent);
      });

      expect(mockManager.saveSkill).toHaveBeenCalledWith('new-skill', mockContent);
      expect(mockManager.listSkills).toHaveBeenCalledTimes(2); // Initial load + reload after save
    });

    it('should throw error when manager is null', async () => {
      const { result } = renderHook(() => useSkills(null));

      await expect(
        result.current.saveSkill('test-skill', {} as SkillContent)
      ).rejects.toThrow('ConfigManager not initialized');
    });
  });

  describe('deleteSkill', () => {
    it('should delete skill and reload list', async () => {
      const mockSkills: Skill[] = [];
      vi.mocked(mockManager.listSkills).mockResolvedValue(mockSkills);
      vi.mocked(mockManager.deleteSkill).mockResolvedValue(undefined);

      const { result } = renderHook(() => useSkills(mockManager));

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Delete skill
      await act(async () => {
        await result.current.deleteSkill('test-skill');
      });

      expect(mockManager.deleteSkill).toHaveBeenCalledWith('test-skill');
      expect(mockManager.listSkills).toHaveBeenCalledTimes(2); // Initial load + reload after delete
    });

    it('should throw error when manager is null', async () => {
      const { result } = renderHook(() => useSkills(null));

      await expect(result.current.deleteSkill('test-skill')).rejects.toThrow(
        'ConfigManager not initialized'
      );
    });
  });

  describe('refresh', () => {
    it('should reload skills list', async () => {
      const mockSkills1: Skill[] = [
        { name: 'skill1', description: 'Skill 1', path: '/path/to/skill1' },
      ];
      const mockSkills2: Skill[] = [
        { name: 'skill1', description: 'Skill 1', path: '/path/to/skill1' },
        { name: 'skill2', description: 'Skill 2', path: '/path/to/skill2' },
      ];

      vi.mocked(mockManager.listSkills)
        .mockResolvedValueOnce(mockSkills1)
        .mockResolvedValueOnce(mockSkills2);

      const { result } = renderHook(() => useSkills(mockManager));

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.skills).toEqual(mockSkills1);
      });

      // Refresh
      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.skills).toEqual(mockSkills2);
    });
  });
});

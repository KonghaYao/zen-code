import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfigManager } from '../ConfigManager.js';
import type { IConfigStore, ISkillStore, IPluginStore, IRemoteStore } from '../interfaces/index.js';
import type { AppConfig, Skill, SkillContent, Plugin, PluginConfig, PluginSource } from '../types/index.js';
import type { PermissionResult } from '../permission/types.js';

// Mock stores
const mockConfigStore = {
  initialize: vi.fn(),
  getConfig: vi.fn(),
  updateConfig: vi.fn(),
} as unknown as IConfigStore;

const mockSkillStore = {
  initialize: vi.fn(),
  listSkills: vi.fn(),
  getSkill: vi.fn(),
  saveSkill: vi.fn(),
  deleteSkill: vi.fn(),
  syncFromRemote: vi.fn(),
} as unknown as ISkillStore;

const mockPluginStore = {
  initialize: vi.fn(),
  listPlugins: vi.fn(),
  getPluginConfig: vi.fn(),
  updatePluginConfig: vi.fn(),
  installPlugin: vi.fn(),
  uninstallPlugin: vi.fn(),
} as unknown as IPluginStore;

const mockRemoteStore = {
  fetchSkill: vi.fn(),
  fetchPlugin: vi.fn(),
  listRemoteSkills: vi.fn(),
  listRemotePlugins: vi.fn(),
} as unknown as IRemoteStore;

describe('ConfigManager', () => {
  let manager: ConfigManager;

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Create a new manager instance for each test
    manager = new ConfigManager(
      mockConfigStore,
      mockSkillStore,
      mockPluginStore,
      mockRemoteStore
    );
  });

  afterEach(() => {
    // Reset manager state
    manager = null as any;
  });

  describe('initialize', () => {
    it('should initialize all stores on first call', async () => {
      await manager.initialize();

      expect(mockConfigStore.initialize).toHaveBeenCalledTimes(1);
      expect(mockSkillStore.initialize).toHaveBeenCalledTimes(1);
      expect(mockPluginStore.initialize).toHaveBeenCalledTimes(1);
    });

    it('should not initialize stores again on subsequent calls', async () => {
      await manager.initialize();
      await manager.initialize();

      expect(mockConfigStore.initialize).toHaveBeenCalledTimes(1);
      expect(mockSkillStore.initialize).toHaveBeenCalledTimes(1);
      expect(mockPluginStore.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('getConfig', () => {
    const mockConfig: AppConfig = {
      main_model: 'gpt-4',
      model_provider: 'openai',
    };

    it('should return config after initialization', async () => {
      (mockConfigStore.getConfig as any).mockResolvedValue(mockConfig);

      await manager.initialize();
      const config = await manager.getConfig();

      expect(config).toEqual(mockConfig);
      expect(mockConfigStore.getConfig).toHaveBeenCalledTimes(1);
    });

    it('should throw error if not initialized', async () => {
      await expect(manager.getConfig()).rejects.toThrow(
        'ConfigManager not initialized. Call await manager.initialize() first.'
      );
    });
  });

  describe('updateConfig', () => {
    it('should update config after initialization', async () => {
      const update = { model: 'gpt-3.5-turbo' };

      await manager.initialize();
      await manager.updateConfig(update);

      expect(mockConfigStore.updateConfig).toHaveBeenCalledWith(update);
      expect(mockConfigStore.updateConfig).toHaveBeenCalledTimes(1);
    });

    it('should throw error if not initialized', async () => {
      await expect(manager.updateConfig({})).rejects.toThrow(
        'ConfigManager not initialized. Call await manager.initialize() first.'
      );
    });
  });

  describe('listSkills', () => {
    const mockSkills: Skill[] = [
      { name: 'skill1', description: 'Test skill 1' },
      { name: 'skill2', description: 'Test skill 2' },
    ];

    it('should return list of skills after initialization', async () => {
      (mockSkillStore.listSkills as any).mockResolvedValue(mockSkills);

      await manager.initialize();
      const skills = await manager.listSkills();

      expect(skills).toEqual(mockSkills);
      expect(mockSkillStore.listSkills).toHaveBeenCalledTimes(1);
    });

    it('should throw error if not initialized', async () => {
      await expect(manager.listSkills()).rejects.toThrow(
        'ConfigManager not initialized. Call await manager.initialize() first.'
      );
    });
  });

  describe('getSkill', () => {
    const mockSkillContent: SkillContent = {
      description: 'Test skill',
      usage: 'Use this for testing',
      content: '# Test Skill\n\nThis is a test skill.',
    };

    it('should return skill content after initialization', async () => {
      (mockSkillStore.getSkill as any).mockResolvedValue(mockSkillContent);

      await manager.initialize();
      const content = await manager.getSkill('skill1');

      expect(content).toEqual(mockSkillContent);
      expect(mockSkillStore.getSkill).toHaveBeenCalledWith('skill1');
    });

    it('should return null if skill not found', async () => {
      (mockSkillStore.getSkill as any).mockResolvedValue(null);

      await manager.initialize();
      const content = await manager.getSkill('nonexistent');

      expect(content).toBeNull();
    });

    it('should throw error if not initialized', async () => {
      await expect(manager.getSkill('skill1')).rejects.toThrow(
        'ConfigManager not initialized. Call await manager.initialize() first.'
      );
    });
  });

  describe('saveSkill', () => {
    const mockSkillContent: SkillContent = {
      description: 'New skill',
      usage: 'Use this new skill',
      content: '# New Skill\n\nThis is a new skill.',
    };

    it('should save skill after initialization', async () => {
      await manager.initialize();
      await manager.saveSkill('newSkill', mockSkillContent);

      expect(mockSkillStore.saveSkill).toHaveBeenCalledWith('newSkill', mockSkillContent);
      expect(mockSkillStore.saveSkill).toHaveBeenCalledTimes(1);
    });

    it('should throw error if not initialized', async () => {
      await expect(manager.saveSkill('newSkill', mockSkillContent)).rejects.toThrow(
        'ConfigManager not initialized. Call await manager.initialize() first.'
      );
    });
  });

  describe('deleteSkill', () => {
    it('should delete skill after initialization', async () => {
      await manager.initialize();
      await manager.deleteSkill('skill1');

      expect(mockSkillStore.deleteSkill).toHaveBeenCalledWith('skill1');
      expect(mockSkillStore.deleteSkill).toHaveBeenCalledTimes(1);
    });

    it('should throw error if not initialized', async () => {
      await expect(manager.deleteSkill('skill1')).rejects.toThrow(
        'ConfigManager not initialized. Call await manager.initialize() first.'
      );
    });
  });

  describe('syncSkillsFromRemote', () => {
    it('should sync skills from remote store after initialization', async () => {
      await manager.initialize();
      await manager.syncSkillsFromRemote();

      expect(mockSkillStore.syncFromRemote).toHaveBeenCalledWith(mockRemoteStore);
      expect(mockSkillStore.syncFromRemote).toHaveBeenCalledTimes(1);
    });

    it('should throw error if not initialized', async () => {
      await expect(manager.syncSkillsFromRemote()).rejects.toThrow(
        'ConfigManager not initialized. Call await manager.initialize() first.'
      );
    });

    it('should throw error if remote store not configured', async () => {
      const managerWithoutRemote = new ConfigManager(
        mockConfigStore,
        mockSkillStore,
        mockPluginStore
        // No remoteStore
      );

      await managerWithoutRemote.initialize();

      await expect(managerWithoutRemote.syncSkillsFromRemote()).rejects.toThrow(
        'Remote store not configured'
      );
    });
  });

  describe('listPlugins', () => {
    const mockPlugins: Plugin[] = [
      { name: 'plugin1', version: '1.0.0' },
      { name: 'plugin2', version: '2.0.0' },
    ];

    it('should return list of plugins after initialization', async () => {
      (mockPluginStore.listPlugins as any).mockResolvedValue(mockPlugins);

      await manager.initialize();
      const plugins = await manager.listPlugins();

      expect(plugins).toEqual(mockPlugins);
      expect(mockPluginStore.listPlugins).toHaveBeenCalledTimes(1);
    });

    it('should throw error if not initialized', async () => {
      await expect(manager.listPlugins()).rejects.toThrow(
        'ConfigManager not initialized. Call await manager.initialize() first.'
      );
    });
  });

  describe('getPluginConfig', () => {
    const mockPluginConfig: PluginConfig = {
      enabled: true,
      settings: { key: 'value' },
    };

    it('should return plugin config after initialization', async () => {
      (mockPluginStore.getPluginConfig as any).mockResolvedValue(mockPluginConfig);

      await manager.initialize();
      const config = await manager.getPluginConfig('plugin1');

      expect(config).toEqual(mockPluginConfig);
      expect(mockPluginStore.getPluginConfig).toHaveBeenCalledWith('plugin1');
    });

    it('should return null if plugin config not found', async () => {
      (mockPluginStore.getPluginConfig as any).mockResolvedValue(null);

      await manager.initialize();
      const config = await manager.getPluginConfig('nonexistent');

      expect(config).toBeNull();
    });

    it('should throw error if not initialized', async () => {
      await expect(manager.getPluginConfig('plugin1')).rejects.toThrow(
        'ConfigManager not initialized. Call await manager.initialize() first.'
      );
    });
  });

  describe('updatePluginConfig', () => {
    const mockPluginConfig: PluginConfig = {
      enabled: false,
      settings: { key: 'newValue' },
    };

    it('should update plugin config after initialization', async () => {
      await manager.initialize();
      await manager.updatePluginConfig('plugin1', mockPluginConfig);

      expect(mockPluginStore.updatePluginConfig).toHaveBeenCalledWith('plugin1', mockPluginConfig);
      expect(mockPluginStore.updatePluginConfig).toHaveBeenCalledTimes(1);
    });

    it('should throw error if not initialized', async () => {
      await expect(manager.updatePluginConfig('plugin1', mockPluginConfig)).rejects.toThrow(
        'ConfigManager not initialized. Call await manager.initialize() first.'
      );
    });
  });

  describe('installPlugin', () => {
    const mockPluginSource: PluginSource = {
      type: 'npm',
      url: 'https://npmjs.com/package/test-plugin',
    };

    it('should install plugin after initialization', async () => {
      await manager.initialize();
      await manager.installPlugin('plugin1', mockPluginSource);

      expect(mockPluginStore.installPlugin).toHaveBeenCalledWith('plugin1', mockPluginSource);
      expect(mockPluginStore.installPlugin).toHaveBeenCalledTimes(1);
    });

    it('should throw error if not initialized', async () => {
      await expect(manager.installPlugin('plugin1', mockPluginSource)).rejects.toThrow(
        'ConfigManager not initialized. Call await manager.initialize() first.'
      );
    });
  });

  describe('uninstallPlugin', () => {
    it('should uninstall plugin after initialization', async () => {
      await manager.initialize();
      await manager.uninstallPlugin('plugin1');

      expect(mockPluginStore.uninstallPlugin).toHaveBeenCalledWith('plugin1');
      expect(mockPluginStore.uninstallPlugin).toHaveBeenCalledTimes(1);
    });

    it('should throw error if not initialized', async () => {
      await expect(manager.uninstallPlugin('plugin1')).rejects.toThrow(
        'ConfigManager not initialized. Call await manager.initialize() first.'
      );
    });
  });

  describe('getConfigPath', () => {
    it('should return the db path from configStore', () => {
      const mockPath = '/path/to/db.json';
      (mockConfigStore as any).dbPath = mockPath;

      const path = manager.getConfigPath();

      expect(path).toBe(mockPath);

      // Clean up
      delete (mockConfigStore as any).dbPath;
    });

    it('should return undefined if dbPath is not set', () => {
      // Ensure dbPath is not set
      delete (mockConfigStore as any).dbPath;

      const path = manager.getConfigPath();

      expect(path).toBeUndefined();
    });
  });

  describe('Permissions', () => {
    beforeEach(async () => {
      // Reset PermissionStore singleton before each permissions test
      const { PermissionStore } = await import('../implementations/permissionStore.js');
      PermissionStore.resetInstance();
    });

    describe('checkBashPermission', () => {
      it('should check bash command permission after initialization', async () => {
        // Mock getConfig to return permissions config
        (mockConfigStore.getConfig as any).mockResolvedValue({
          main_model: 'gpt-4',
          permissions: {
            allow: ['Bash(git status)'],  // Use exact match
            ask: [],
            deny: [],
            defaultMode: 'ask' as const,
          },
        } as AppConfig);

        await manager.initialize();
        const result = await manager.checkBashPermission('git status');

        expect(result).toBeDefined();
        expect(result?.allowed).toBe(true);
        expect(result?.requiresApproval).toBe(false);
        expect(result?.matchedRule?.action).toBe('allow');
      });

      it('should throw error if not initialized', async () => {
        await expect(manager.checkBashPermission('git status')).rejects.toThrow(
          'ConfigManager not initialized. Call await manager.initialize() first.'
        );
      });

      it('should handle cwd parameter', async () => {
        (mockConfigStore.getConfig as any).mockResolvedValue({
          main_model: 'gpt-4',
          permissions: {
            allow: ['Bash(ls )'],
            ask: [],
            deny: [],
            defaultMode: 'ask' as const,
          },
        } as AppConfig);

        await manager.initialize();
        const result = await manager.checkBashPermission('ls', '/tmp');

        expect(result).toBeDefined();
      });
    });

    describe('checkReadPermission', () => {
      it('should check read file permission after initialization', async () => {
        const mockPermissionResult: PermissionResult = {
          allowed: true,
          requiresApproval: false,
        };

        (mockConfigStore.getConfig as any).mockResolvedValue({
          main_model: 'gpt-4',
          permissions: {
            allow: ['Read(./src/*.ts)'],
            ask: [],
            deny: [],
            defaultMode: 'ask' as const,
          },
        } as AppConfig);

        await manager.initialize();
        const result = await manager.checkReadPermission('./src/test.ts');

        expect(result).toBeDefined();
      });

      it('should throw error if not initialized', async () => {
        await expect(manager.checkReadPermission('./test.txt')).rejects.toThrow(
          'ConfigManager not initialized. Call await manager.initialize() first.'
        );
      });
    });

    describe('checkWritePermission', () => {
      it('should check write file permission after initialization', async () => {
        (mockConfigStore.getConfig as any).mockResolvedValue({
          main_model: 'gpt-4',
          permissions: {
            allow: ['Write(./dist/*.js)'],
            ask: [],
            deny: ['Write(.env)'],
            defaultMode: 'ask' as const,
          },
        } as AppConfig);

        await manager.initialize();
        const result = await manager.checkWritePermission('./dist/bundle.js');

        expect(result).toBeDefined();
      });

      it('should throw error if not initialized', async () => {
        await expect(manager.checkWritePermission('./test.txt')).rejects.toThrow(
          'ConfigManager not initialized. Call await manager.initialize() first.'
        );
      });
    });

    describe('getPermissionMatcher', () => {
      it('should get permission matcher after initialization', async () => {
        (mockConfigStore.getConfig as any).mockResolvedValue({
          main_model: 'gpt-4',
          permissions: {
            allow: ['Bash(git status)'],
            ask: [],
            deny: [],
            defaultMode: 'ask' as const,
          },
        } as AppConfig);

        await manager.initialize();
        const matcher = await manager.getPermissionMatcher();

        expect(matcher).toBeDefined();
      });

      it('should return undefined if no permissions configured', async () => {
        (mockConfigStore.getConfig as any).mockResolvedValue({
          main_model: 'gpt-4',
          // No permissions field
        } as AppConfig);

        await manager.initialize();
        const matcher = await manager.getPermissionMatcher();

        expect(matcher).toBeUndefined();
      });

      it('should throw error if not initialized', async () => {
        await expect(manager.getPermissionMatcher()).rejects.toThrow(
          'ConfigManager not initialized. Call await manager.initialize() first.'
        );
      });
    });

    describe('setToolNameMapper', () => {
      it('should set tool name mapper', async () => {
        await manager.initialize();

        manager.setToolNameMapper({ 'myCustomBash': 'Bash' });

        // Tool name mapper should be set
        // Note: We can't directly access permissionStore to verify,
        // but we can verify it doesn't throw an error
        expect(() => manager.setToolNameMapper({ 'test': 'Bash' })).not.toThrow();
      });

      it('should allow updating mapper multiple times', async () => {
        await manager.initialize();

        manager.setToolNameMapper({ 'mapper1': 'Bash' });
        manager.setToolNameMapper({ 'mapper2': 'Read', 'mapper3': 'Write' });

        expect(() => manager.setToolNameMapper({})).not.toThrow();
      });
    });
  });
});

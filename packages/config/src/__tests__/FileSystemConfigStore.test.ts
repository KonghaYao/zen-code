import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FileSystemConfigStore } from '../implementations/FileSystemConfigStore.js';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { AppConfig } from '../types/index.js';

// Helper to create a temporary directory for testing
async function createTempDir(): Promise<string> {
  const tmpDir = path.join(os.tmpdir(), `zen-config-test-${Date.now()}`);
  await fs.promises.mkdir(tmpDir, { recursive: true });
  return tmpDir;
}

// Helper to clean up temporary directory
async function cleanupTempDir(tmpDir: string): Promise<void> {
  if (fs.existsSync(tmpDir)) {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
}

describe('FileSystemConfigStore', () => {
  let store: FileSystemConfigStore;
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    // Save original environment variables
    originalEnv = { ...process.env };
    
    // Create temporary directory for testing
    tempDir = await createTempDir();
    
    // Mock os.homedir to return temp directory
    vi.spyOn(os, 'homedir').mockReturnValue(tempDir);
    
    // Create store instance
    store = new FileSystemConfigStore();
  });

  afterEach(async () => {
    // Clean up temporary directory
    await cleanupTempDir(tempDir);
    
    // Restore environment variables
    process.env = originalEnv;
    
    // Restore mocks
    vi.restoreAllMocks();
  });

  describe('initialize', () => {
    it('should create the zen-code directory if it does not exist', async () => {
      await store.initialize();
      
      const zenConfigDir = path.join(tempDir, '.zen-code');
      expect(fs.existsSync(zenConfigDir)).toBe(true);
    });

    it('should create the settings.json file with default config', async () => {
      await store.initialize();
      
      const settingsPath = path.join(tempDir, '.zen-code', 'settings.json');
      
      // Trigger an update to ensure file is created
      await store.updateConfig({});
      
      // File should now exist
      expect(fs.existsSync(settingsPath)).toBe(true);
      
      const content = await fs.promises.readFile(settingsPath, 'utf-8');
      const data = JSON.parse(content);
      
      expect(data).toHaveProperty('config');
      expect(data.config.main_model).toBe('claude-sonnet-4-5');
      expect(data.config.model_provider).toBe('openai');
    });

    it('should not overwrite existing config file', async () => {
      // Create a custom config file
      const zenConfigDir = path.join(tempDir, '.zen-code');
      await fs.promises.mkdir(zenConfigDir, { recursive: true });
      
      const customConfig = {
        config: {
          main_model: 'custom-model',
          model_provider: 'anthropic',
        },
      };
      
      const settingsPath = path.join(zenConfigDir, 'settings.json');
      await fs.promises.writeFile(settingsPath, JSON.stringify(customConfig, null, 2));
      
      // Initialize store
      await store.initialize();
      
      // Check that custom config is preserved
      const config = await store.getConfig();
      expect(config.main_model).toBe('custom-model');
      expect(config.model_provider).toBe('anthropic');
    });

    it('should sync config to environment variables', async () => {
      await store.initialize();
      
      expect(process.env.MODEL_PROVIDER).toBe('openai');
    });
  });

  describe('getConfig', () => {
    it('should return the current config', async () => {
      await store.initialize();
      
      const config = await store.getConfig();
      
      expect(config).toHaveProperty('main_model');
      expect(config).toHaveProperty('model_provider');
      expect(config.main_model).toBe('claude-sonnet-4-5');
      expect(config.model_provider).toBe('openai');
    });

    it('should reflect updates made to the config', async () => {
      await store.initialize();
      
      await store.updateConfig({ main_model: 'updated-model' });
      
      const config = await store.getConfig();
      expect(config.main_model).toBe('updated-model');
    });
  });

  describe('updateConfig', () => {
    it('should update partial config fields', async () => {
      await store.initialize();
      
      await store.updateConfig({ main_model: 'new-model' });
      
      const config = await store.getConfig();
      expect(config.main_model).toBe('new-model');
      expect(config.model_provider).toBe('openai'); // unchanged
    });

    it('should persist changes to disk', async () => {
      await store.initialize();
      
      await store.updateConfig({ 
        main_model: 'persisted-model',
        model_provider: 'anthropic'
      });
      
      // Create a new store instance to read from disk
      const newStore = new FileSystemConfigStore();
      await newStore.initialize();
      
      const config = await newStore.getConfig();
      expect(config.main_model).toBe('persisted-model');
      expect(config.model_provider).toBe('anthropic');
    });

    it('should sync OpenAI config to environment variables', async () => {
      await store.initialize();
      
      await store.updateConfig({ 
        model_provider: 'openai',
        openai_api_key: 'test-openai-key',
        openai_base_url: 'https://api.openai.com/v1'
      });
      
      expect(process.env.MODEL_PROVIDER).toBe('openai');
      expect(process.env.OPENAI_API_KEY).toBe('test-openai-key');
      expect(process.env.OPENAI_BASE_URL).toBe('https://api.openai.com/v1');
    });

    it('should sync Anthropic config to environment variables', async () => {
      await store.initialize();
      
      await store.updateConfig({ 
        model_provider: 'anthropic',
        anthropic_api_key: 'test-anthropic-key',
        anthropic_base_url: 'https://api.anthropic.com'
      });
      
      expect(process.env.MODEL_PROVIDER).toBe('anthropic');
      expect(process.env.ANTHROPIC_API_KEY).toBe('test-anthropic-key');
      expect(process.env.ANTHROPIC_BASE_URL).toBe('https://api.anthropic.com');
    });

    it('should update multiple config fields at once', async () => {
      await store.initialize();
      
      const updates: Partial<AppConfig> = {
        main_model: 'multi-update-model',
        model_provider: 'custom',
        openai_api_key: 'key1',
        anthropic_api_key: 'key2',
      };
      
      await store.updateConfig(updates);
      
      const config = await store.getConfig();
      expect(config.main_model).toBe('multi-update-model');
      expect(config.model_provider).toBe('custom');
      expect(config.openai_api_key).toBe('key1');
      expect(config.anthropic_api_key).toBe('key2');
    });
  });

  describe('getZenConfigDir', () => {
    it('should return the zen-code directory path', () => {
      const zenConfigDir = store.getZenConfigDir();
      
      expect(zenConfigDir).toBe(path.join(tempDir, '.zen-code'));
    });
  });

  describe('dbPath', () => {
    it('should expose the database file path', () => {
      const dbPath = store.dbPath;
      
      expect(dbPath).toBe(path.join(tempDir, '.zen-code', 'settings.json'));
    });
  });

  describe('edge cases', () => {
    it('should handle empty config updates', async () => {
      await store.initialize();
      
      const originalConfig = await store.getConfig();
      await store.updateConfig({});
      
      const config = await store.getConfig();
      expect(config).toEqual(originalConfig);
    });

    it('should handle concurrent reads and writes', async () => {
      await store.initialize();
      
      // Simulate concurrent operations
      const promises = [
        store.getConfig(),
        store.updateConfig({ main_model: 'model-1' }),
        store.getConfig(),
        store.updateConfig({ main_model: 'model-2' }),
        store.getConfig(),
      ];
      
      await Promise.all(promises);
      
      const finalConfig = await store.getConfig();
      expect(finalConfig.main_model).toBe('model-2');
    });
  });
});

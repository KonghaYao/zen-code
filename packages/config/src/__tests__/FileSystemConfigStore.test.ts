import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FileSystemConfigStore } from '../implementations/FileSystemConfigStore.js';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { AppConfig, LegacyAppConfig } from '../types/index.js';

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
        it('should create zen-code directory if it does not exist', async () => {
            await store.initialize();

            const zenConfigDir = path.join(tempDir, '.zen-code');
            expect(fs.existsSync(zenConfigDir)).toBe(true);
        });

        it('should create settings.json file with default config', async () => {
            await store.initialize();

            const settingsPath = path.join(tempDir, '.zen-code', 'settings.json');

            // Trigger an update to ensure file is created
            await store.updateConfig({});

            // File should now exist
            expect(fs.existsSync(settingsPath)).toBe(true);

            const content = await fs.promises.readFile(settingsPath, 'utf-8');
            const data = JSON.parse(content);

            expect(data).toHaveProperty('config');
            expect(data.config.provider_id).toBe('default');
            expect(data.config.model_id).toBe('claude-sonnet-4-5');
            expect(data.config.providers).toBeInstanceOf(Array);
            expect(data.config.providers.length).toBeGreaterThan(0);
        });

        it('should not overwrite existing config file', async () => {
            // Create a custom config file (new format)
            const zenConfigDir = path.join(tempDir, '.zen-code');
            await fs.promises.mkdir(zenConfigDir, { recursive: true });

            const customConfig = {
                config: {
                    provider_id: 'custom',
                    model_id: 'custom-model',
                    providers: [
                        {
                            id: 'custom',
                            type: 'openai' as const,
                            apiKey: 'custom-key',
                            baseUrl: 'https://custom.api.com/v1',
                        },
                    ],
                },
            };

            const settingsPath = path.join(zenConfigDir, 'settings.json');
            await fs.promises.writeFile(settingsPath, JSON.stringify(customConfig, null, 2));

            // Initialize store
            await store.initialize();

            // Check that custom config is preserved
            const config = await store.getConfig();
            expect(config.provider_id).toBe('custom');
            expect(config.model_id).toBe('custom-model');
            expect(config.providers[0].id).toBe('custom');
        });

        it('should migrate legacy config to new format', async () => {
            // Create a legacy config file
            const zenConfigDir = path.join(tempDir, '.zen-code');
            await fs.promises.mkdir(zenConfigDir, { recursive: true });

            const legacyConfig: LegacyAppConfig = {
                main_model: 'gpt-4',
                model_provider: 'openai',
                openai_api_key: 'legacy-key',
                openai_base_url: 'https://legacy.api.com/v1',
            };

            const settingsPath = path.join(zenConfigDir, 'settings.json');
            await fs.promises.writeFile(settingsPath, JSON.stringify({ config: legacyConfig }, null, 2));

            // Initialize store - should trigger migration
            await store.initialize();

            // Check that config was migrated
            const config = await store.getConfig();

            // New format should have provider_id and model_id
            expect(config.provider_id).toBeDefined();
            expect(config.model_id).toBe('gpt-4');
            expect(config.providers).toBeInstanceOf(Array);
            expect(config.providers.length).toBeGreaterThan(0);

            // Provider should have legacy API key and base URL
            const provider = config.providers.find((p) => p.id === 'openai');
            expect(provider?.apiKey).toBe('legacy-key');
            expect(provider?.baseUrl).toBe('https://legacy.api.com/v1');
        });

        it('should sync config to environment variables', async () => {
            await store.initialize();

            expect(process.env.MODEL_PROVIDER).toBe('openai');
        });
    });

    describe('getConfig', () => {
        it('should return current config', async () => {
            await store.initialize();

            const config = await store.getConfig();

            expect(config).toHaveProperty('provider_id');
            expect(config).toHaveProperty('model_id');
            expect(config).toHaveProperty('providers');
            expect(config.provider_id).toBe('default');
            expect(config.model_id).toBe('claude-sonnet-4-5');
        });

        it('should reflect updates made to the config', async () => {
            await store.initialize();

            await store.updateConfig({ model_id: 'updated-model' });

            const config = await store.getConfig();
            expect(config.model_id).toBe('updated-model');
        });
    });

    describe('updateConfig', () => {
        it('should update partial config fields', async () => {
            await store.initialize();

            await store.updateConfig({ model_id: 'new-model' });

            const config = await store.getConfig();
            expect(config.model_id).toBe('new-model');
            expect(config.provider_id).toBe('default'); // unchanged
        });

        it('should persist changes to disk', async () => {
            await store.initialize();

            await store.updateConfig({
                model_id: 'persisted-model',
            });

            // Create a new store instance to read from disk
            const newStore = new FileSystemConfigStore();
            await newStore.initialize();

            const config = await newStore.getConfig();
            expect(config.model_id).toBe('persisted-model');
        });

        it('should sync provider config to environment variables', async () => {
            await store.initialize();

            const updates: Partial<AppConfig> = {
                provider_id: 'openai',
                providers: [
                    {
                        id: 'openai',
                        type: 'openai',
                        apiKey: 'test-openai-key',
                        baseUrl: 'https://api.openai.com/v1',
                    },
                ],
            };

            await store.updateConfig(updates);

            expect(process.env.MODEL_PROVIDER).toBe('openai');
            expect(process.env.OPENAI_API_KEY).toBe('test-openai-key');
            expect(process.env.OPENAI_BASE_URL).toBe('https://api.openai.com/v1');
        });

        it('should sync Anthropic provider to environment variables', async () => {
            await store.initialize();

            const updates: Partial<AppConfig> = {
                provider_id: 'anthropic',
                providers: [
                    {
                        id: 'anthropic',
                        type: 'anthropic',
                        apiKey: 'test-anthropic-key',
                        baseUrl: 'https://api.anthropic.com',
                    },
                ],
            };

            await store.updateConfig(updates);

            expect(process.env.MODEL_PROVIDER).toBe('anthropic');
            expect(process.env.ANTHROPIC_API_KEY).toBe('test-anthropic-key');
            expect(process.env.ANTHROPIC_BASE_URL).toBe('https://api.anthropic.com');
        });
    });

    describe('getZenConfigDir', () => {
        it('should return zen-code directory path', () => {
            const zenConfigDir = store.getZenConfigDir();

            expect(zenConfigDir).toBe(path.join(tempDir, '.zen-code'));
        });
    });

    describe('dbPath', () => {
        it('should expose database file path', () => {
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
                store.updateConfig({ model_id: 'model-1' }),
                store.getConfig(),
                store.updateConfig({ model_id: 'model-2' }),
                store.getConfig(),
            ];

            await Promise.all(promises);

            const finalConfig = await store.getConfig();
            expect(finalConfig.model_id).toBe('model-2');
        });
    });
});

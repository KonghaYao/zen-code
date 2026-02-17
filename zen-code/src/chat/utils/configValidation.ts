/**
 * 配置验证工具
 *
 * 检查配置是否有效，用于启动时判断是否需要进入配置向导
 */

import type { AppConfig, ProviderConfig } from '@codegraph/config';

export interface ConfigValidationResult {
    isValid: boolean;
    needsSetup: boolean;
    reason?: string;
    missingApiKey?: boolean;
    invalidProviderRef?: boolean;
}

/**
 * 验证配置是否有效
 *
 * 检查项：
 * 1. 配置文件是否存在
 * 2. 是否有至少一个 provider
 * 3. provider_id 指向的 provider 是否存在
 * 4. 当前 provider 是否配置了 API Key
 */
export function validateConfig(config: AppConfig | null): ConfigValidationResult {
    // 情况 1: 没有配置文件或配置为空
    if (!config) {
        return {
            isValid: false,
            needsSetup: true,
            reason: '未找到配置文件',
        };
    }

    // 情况 2: 没有任何 provider
    if (!config.providers || config.providers.length === 0) {
        return {
            isValid: false,
            needsSetup: true,
            reason: '未配置任何 Provider',
        };
    }

    // 情况 3: provider_id 无效（指向不存在的 provider）
    const currentProvider = config.providers.find((p: ProviderConfig) => p.id === config.provider_id);
    if (!currentProvider) {
        return {
            isValid: false,
            needsSetup: true,
            reason: `Provider "${config.provider_id}" 不存在`,
            invalidProviderRef: true,
        };
    }

    // 情况 4: 当前 provider 没有配置 API Key
    if (!currentProvider.apiKey || currentProvider.apiKey.trim() === '') {
        return {
            isValid: false,
            needsSetup: true,
            reason: `Provider "${config.provider_id}" 未配置 API Key`,
            missingApiKey: true,
        };
    }

    // 配置有效
    return {
        isValid: true,
        needsSetup: false,
    };
}

/**
 * 检查是否需要设置向导
 */
export function needsSetupWizard(config: AppConfig | null): boolean {
    const result = validateConfig(config);
    return result.needsSetup;
}

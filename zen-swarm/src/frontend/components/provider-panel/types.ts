/**
 * ProviderPanel Types
 */

export type ProviderType = 'openai' | 'anthropic';

export interface Provider {
    id: string;
    name: string;
    type: ProviderType;
    apiKey: string; // 脱敏显示
    baseUrl: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ProviderFormData {
    name: string;
    type: ProviderType;
    apiKey: string;
    baseUrl: string;
    isActive: boolean;
}

export interface ProviderPanelState {
    mode: 'list' | 'create' | 'edit';
    editingId: string | null;
    deleteConfirmId: string | null;
}

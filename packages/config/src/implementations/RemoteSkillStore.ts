import type { ISkillStore, IRemoteStore } from '../interfaces/ISkillStore.js';
import type { Skill, SkillContent } from '../types/index.js';

/**
 * 远程技能存储实现（通过 HTTP 与 ConfigServer 通信）
 */
export class RemoteSkillStore implements ISkillStore {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  async initialize(): Promise<void> {
    // 远程模式无需初始化
  }

  async listSkills(): Promise<Skill[]> {
    return this.request<Skill[]>('/api/skills');
  }

  async getSkill(name: string): Promise<SkillContent | null> {
    const url = `/api/skill?name=${encodeURIComponent(name)}`;
    return this.request<SkillContent>(url);
  }

  async saveSkill(name: string, content: SkillContent): Promise<void> {
    await this.request('/api/skill', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, content }),
    });
  }

  async deleteSkill(name: string): Promise<void> {
    await this.request('/api/skill', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
  }

  async syncFromRemote(remote: IRemoteStore): Promise<void> {
    await this.request('/api/skills/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ remote }),
    });
  }
}

/**
 * 远程 Skill 仓库抽象接口
 */

export interface RemoteSkillItem {
    name: string;
    description?: string;
    /** SKILL.md 完整内容（含 YAML frontmatter） */
    content: string;
    tags?: string[];
    author?: string;
    source_url?: string;
    version?: string;
    downloads?: number;
    stars?: number;
}

export interface IRemoteSkillStore {
    /**
     * 列出远程可用的 skills
     */
    listRemoteSkills(options?: { page?: number; limit?: number }): Promise<RemoteSkillItem[]>;

    /**
     * 按关键词搜索 skills
     */
    searchRemoteSkills(query: string): Promise<RemoteSkillItem[]>;

    /**
     * 获取单个 skill 的完整内容
     */
    fetchRemoteSkill(name: string): Promise<RemoteSkillItem | null>;
}

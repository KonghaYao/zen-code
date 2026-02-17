import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import yaml from 'yaml';
import type { ISkillStore, IRemoteStore } from '../interfaces/ISkillStore.js';
import type { Skill, SkillContent } from '../types/index.js';

/**
 * 文件系统 Skill 存储实现
 */
export class FileSystemSkillStore implements ISkillStore {
    private skillsDir: string;
    private projectSkillsDir: string;

    constructor() {
        const userHome = os.homedir();
        this.skillsDir = path.join(userHome, '.claude', 'code', 'skills');
        // 假设当前工作目录是项目根目录
        this.projectSkillsDir = path.join(process.cwd(), '.claude', 'skills');
    }

    async listSkills(): Promise<Skill[]> {
        const skills: Skill[] = [];

        // 列出用户 skills
        const userSkills = await this.listSkillsInDir(this.skillsDir);
        skills.push(...userSkills);

        // 列出项目 skills（优先级更高）
        const projectSkills = await this.listSkillsInDir(this.projectSkillsDir);
        skills.push(...projectSkills);

        return skills;
    }

    private async listSkillsInDir(dir: string): Promise<Skill[]> {
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            const skills: Skill[] = [];

            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const skillPath = path.join(dir, entry.name, 'SKILL.md');
                    try {
                        const content = await fs.readFile(skillPath, 'utf-8');
                        const frontmatter = this.parseFrontmatter(content);
                        skills.push({
                            name: entry.name,
                            description: frontmatter.description || '',
                            path: skillPath,
                        });
                    } catch {
                        // 跳过无效的 skill
                    }
                }
            }

            return skills;
        } catch {
            return [];
        }
    }

    async getSkill(name: string): Promise<SkillContent | null> {
        // 先在项目 skills 中查找
        const projectPath = path.join(this.projectSkillsDir, name, 'SKILL.md');
        try {
            const content = await fs.readFile(projectPath, 'utf-8');
            return this.parseSkillContent(content);
        } catch {
            // 未找到，尝试用户 skills
        }

        const userPath = path.join(this.skillsDir, name, 'SKILL.md');
        try {
            const content = await fs.readFile(userPath, 'utf-8');
            return this.parseSkillContent(content);
        } catch {
            return null;
        }
    }

    async saveSkill(name: string, content: SkillContent): Promise<void> {
        const skillDir = path.join(this.skillsDir, name);
        await fs.mkdir(skillDir, { recursive: true });

        const markdown = this.formatSkillContent(content);
        await fs.writeFile(path.join(skillDir, 'SKILL.md'), markdown, 'utf-8');
    }

    async deleteSkill(name: string): Promise<void> {
        const skillDir = path.join(this.skillsDir, name);
        await fs.rm(skillDir, { recursive: true, force: true });
    }

    async syncFromRemote(remoteStore: IRemoteStore): Promise<void> {
        const remoteSkills = await remoteStore.listRemoteSkills();

        for (const skill of remoteSkills) {
            const content = await remoteStore.fetchSkill(skill.name);
            if (content) {
                await this.saveSkill(skill.name, content);
            }
        }
    }

    private parseFrontmatter(markdown: string): Record<string, any> {
        const match = markdown.match(/^---\n(.+?)\n---/s);
        if (!match) return {};

        try {
            return yaml.parse(match[1]);
        } catch {
            return {};
        }
    }

    private parseSkillContent(markdown: string): SkillContent {
        const frontmatter = this.parseFrontmatter(markdown);
        const content = markdown.replace(/^---\n.+?\n---\n*/s, '');

        return { frontmatter, markdown: content };
    }

    private formatSkillContent(content: SkillContent): string {
        const frontmatterYaml = yaml.stringify(content.frontmatter).trim();
        return `---\n${frontmatterYaml}\n---\n\n${content.markdown}`;
    }
}

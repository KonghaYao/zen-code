import { join } from 'path';
import { basename } from 'path';

export async function initSkill(): Promise<void> {
    const cwd = process.cwd();
    const defaultName = basename(cwd)
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-');

    const skillJson = {
        name: defaultName,
        version: '1.0.0',
        description: 'My AI skill',
        author: '',
        license: 'MIT',
        keywords: [],
        files: [],
        dependencies: {},
    };

    const skillJsonPath = join(cwd, 'skill.json');
    const skillMdPath = join(cwd, 'SKILL.md');

    const jsonFile = Bun.file(skillJsonPath);
    if (await jsonFile.exists()) {
        console.log('skill.json already exists, skipping.');
    } else {
        await Bun.write(skillJsonPath, JSON.stringify(skillJson, null, 2) + '\n');
        console.log('✅ Created skill.json');
    }

    const mdFile = Bun.file(skillMdPath);
    if (await mdFile.exists()) {
        console.log('SKILL.md already exists, skipping.');
    } else {
        const mdContent = `---
name: '${defaultName}'
description: 'My AI skill description for matching'
---

# ${defaultName}

Describe what this skill does and how to use it.

## Usage

Instructions for the AI agent...
`;
        await Bun.write(skillMdPath, mdContent);
        console.log('✅ Created SKILL.md');
    }

    console.log(`\n📦 Initialized skill: ${defaultName}`);
    console.log('\nNext steps:');
    console.log('  1. Edit SKILL.md with your skill instructions');
    console.log('  2. Edit skill.json to add description, keywords');
    console.log('  3. skillpkg login');
    console.log('  4. skillpkg publish');
}

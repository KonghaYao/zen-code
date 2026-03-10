/**
 * SkillPkg 测试数据种子脚本
 * 用于验收测试，通过 API 端点插入真实数据
 *
 * 运行: bun run scripts/seed.ts
 */

const BASE_URL = process.env.REGISTRY_URL ?? 'http://localhost:3000';

// ──────────────────────────────────────────────
// 测试用户数据
// ──────────────────────────────────────────────
const USERS = [
    {
        username: 'alice',
        email: 'alice@example.com',
        password: 'password123',
    },
    {
        username: 'bob',
        email: 'bob@example.com',
        password: 'password456',
    },
    {
        username: 'charlie',
        email: 'charlie@example.com',
        password: 'password789',
    },
];

// ──────────────────────────────────────────────
// 测试 Skill 数据（模拟真实 Claude Code skills）
// ──────────────────────────────────────────────
const SKILLS: Array<{
    owner: string; // username
    name: string;
    description: string;
    keywords: string[];
    versions: Array<{
        version: string;
        readme: string;
        skill_json: Record<string, unknown>;
    }>;
}> = [
    {
        owner: 'alice',
        name: 'code-review',
        description: 'Automated code review skill for pull requests and code quality checks',
        keywords: ['code-review', 'quality', 'ci', 'pull-request'],
        versions: [
            {
                version: '1.0.0',
                readme: `# code-review\n\nAutomated code review skill.\n\n## Usage\n\nTrigger with \`/review\` command.\n\n## Features\n\n- Checks code style\n- Identifies potential bugs\n- Suggests improvements`,
                skill_json: {
                    name: 'code-review',
                    version: '1.0.0',
                    description: 'Automated code review skill',
                    trigger: '/review',
                    keywords: ['code-review', 'quality'],
                },
            },
            {
                version: '1.1.0',
                readme: `# code-review v1.1.0\n\nImproved code review skill with TypeScript support.\n\n## What's New\n\n- TypeScript type checking\n- Better error messages`,
                skill_json: {
                    name: 'code-review',
                    version: '1.1.0',
                    description: 'Automated code review skill with TypeScript support',
                    trigger: '/review',
                    keywords: ['code-review', 'quality', 'typescript'],
                },
            },
            {
                version: '2.0.0',
                readme: `# code-review v2.0.0\n\nMajor rewrite with AI-powered suggestions.\n\n## Breaking Changes\n\n- New configuration format\n\n## Features\n\n- AI-powered suggestions\n- Multi-language support\n- Integration with GitHub Actions`,
                skill_json: {
                    name: 'code-review',
                    version: '2.0.0',
                    description: 'AI-powered code review skill',
                    trigger: '/review',
                    keywords: ['code-review', 'quality', 'ai'],
                },
            },
        ],
    },
    {
        owner: 'alice',
        name: 'git-helper',
        description: 'Git workflow automation: commits, branches, PRs and changelogs',
        keywords: ['git', 'workflow', 'commit', 'changelog'],
        versions: [
            {
                version: '0.1.0',
                readme: `# git-helper\n\nGit workflow automation skill.\n\n## Commands\n\n- \`/commit\` - Smart commit messages\n- \`/changelog\` - Generate changelogs`,
                skill_json: {
                    name: 'git-helper',
                    version: '0.1.0',
                    description: 'Git workflow automation',
                    keywords: ['git', 'workflow'],
                },
            },
            {
                version: '0.2.0',
                readme: `# git-helper v0.2.0\n\nAdded PR template generation.\n\n## New Commands\n\n- \`/pr\` - Generate PR descriptions`,
                skill_json: {
                    name: 'git-helper',
                    version: '0.2.0',
                    description: 'Git workflow automation with PR support',
                    keywords: ['git', 'workflow', 'pr'],
                },
            },
        ],
    },
    {
        owner: 'bob',
        name: 'test-generator',
        description: 'Automatically generate unit tests for TypeScript and JavaScript projects',
        keywords: ['testing', 'unit-test', 'typescript', 'jest', 'vitest'],
        versions: [
            {
                version: '1.0.0',
                readme: `# test-generator\n\nAutomatic test generation skill.\n\n## Supported Frameworks\n\n- Jest\n- Vitest\n- Mocha\n\n## Usage\n\nRun \`/gen-test <file>\` to generate tests.`,
                skill_json: {
                    name: 'test-generator',
                    version: '1.0.0',
                    description: 'Automatic test generation',
                    keywords: ['testing', 'vitest'],
                },
            },
        ],
    },
    {
        owner: 'bob',
        name: 'docker-deploy',
        description: 'Simplify Docker builds and deployment workflows',
        keywords: ['docker', 'deploy', 'devops', 'container'],
        versions: [
            {
                version: '1.0.0',
                readme: `# docker-deploy\n\nDocker deployment skill.\n\n## Commands\n\n- \`/docker build\` - Build image\n- \`/docker push\` - Push to registry\n- \`/docker deploy\` - Deploy to server`,
                skill_json: {
                    name: 'docker-deploy',
                    version: '1.0.0',
                    description: 'Docker deployment automation',
                    keywords: ['docker', 'deploy'],
                },
            },
            {
                version: '1.0.1',
                readme: `# docker-deploy v1.0.1\n\nBugfix: Fixed port mapping issue.`,
                skill_json: {
                    name: 'docker-deploy',
                    version: '1.0.1',
                    description: 'Docker deployment automation (bugfix)',
                    keywords: ['docker', 'deploy'],
                },
            },
            {
                version: '2.0.0',
                readme: `# docker-deploy v2.0.0\n\nAdded Kubernetes support.\n\n## New Features\n\n- Kubernetes deployments\n- Helm chart generation\n- Rolling updates`,
                skill_json: {
                    name: 'docker-deploy',
                    version: '2.0.0',
                    description: 'Docker and Kubernetes deployment automation',
                    keywords: ['docker', 'kubernetes', 'deploy', 'helm'],
                },
            },
        ],
    },
    {
        owner: 'charlie',
        name: 'sql-assistant',
        description: 'SQL query writing, optimization and schema design assistant',
        keywords: ['sql', 'database', 'query', 'optimization', 'postgresql'],
        versions: [
            {
                version: '1.0.0',
                readme: `# sql-assistant\n\nSQL query assistant skill.\n\n## Features\n\n- Write SQL queries from natural language\n- Optimize existing queries\n- Generate schema migrations`,
                skill_json: {
                    name: 'sql-assistant',
                    version: '1.0.0',
                    description: 'SQL query writing and optimization',
                    keywords: ['sql', 'database'],
                },
            },
        ],
    },
    {
        owner: 'charlie',
        name: 'api-docs',
        description: 'Generate OpenAPI documentation from TypeScript code',
        keywords: ['api', 'documentation', 'openapi', 'swagger', 'typescript'],
        versions: [
            {
                version: '0.9.0',
                readme: `# api-docs v0.9.0 (beta)\n\nOpenAPI documentation generator.\n\n## Status\n\nBeta version - API may change.\n\n## Usage\n\n\`/gen-docs <source>\``,
                skill_json: {
                    name: 'api-docs',
                    version: '0.9.0',
                    description: 'OpenAPI documentation generator (beta)',
                    keywords: ['api', 'openapi'],
                },
            },
            {
                version: '1.0.0',
                readme: `# api-docs v1.0.0\n\nStable release of OpenAPI documentation generator.\n\n## Features\n\n- Auto-detect Express/Elysia/Hono routes\n- Generate OpenAPI 3.1 spec\n- Export to Swagger UI`,
                skill_json: {
                    name: 'api-docs',
                    version: '1.0.0',
                    description: 'OpenAPI documentation generator',
                    keywords: ['api', 'openapi', 'swagger'],
                },
            },
        ],
    },
];

// ──────────────────────────────────────────────
// 工具函数
// ──────────────────────────────────────────────

function log(msg: string) {
    console.log(`  ${msg}`);
}

function logSection(title: string) {
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`▶ ${title}`);
    console.log('─'.repeat(50));
}

async function apiPost(path: string, body: unknown, token?: string) {
    const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
    });
    return res.json();
}

/** 创建一个最小的假 tarball（仅用于测试，非真实 .tar.gz） */
function makeFakeTarball(name: string, version: string): string {
    const content = `SKILL:${name}@${version}`;
    return Buffer.from(content).toString('base64');
}

// ──────────────────────────────────────────────
// 主流程
// ──────────────────────────────────────────────

async function seed() {
    console.log(`\n📦 SkillPkg 测试数据种子脚本`);
    console.log(`   目标: ${BASE_URL}\n`);

    // 1. 注册用户并获取 token
    logSection('注册测试用户');
    const tokens: Record<string, string> = {};

    for (const user of USERS) {
        const res = await apiPost('/api/auth/register', user);
        if (res.token) {
            tokens[user.username] = res.token;
            log(`✅ 注册成功: @${user.username} (${user.email})`);
        } else if (res.error?.includes('already')) {
            // 已存在则登录
            const loginRes = await apiPost('/api/auth/login', {
                email: user.email,
                password: user.password,
            });
            if (loginRes.token) {
                tokens[user.username] = loginRes.token;
                log(`ℹ️  已存在，登录成功: @${user.username}`);
            } else {
                log(`❌ 无法获取 token: @${user.username} — ${JSON.stringify(loginRes)}`);
            }
        } else {
            log(`❌ 注册失败: @${user.username} — ${JSON.stringify(res)}`);
        }
    }

    // 2. 发布 Skills
    logSection('发布 Skills');

    for (const skill of SKILLS) {
        const token = tokens[skill.owner];
        if (!token) {
            log(`⚠️  跳过 ${skill.name}（找不到 @${skill.owner} 的 token）`);
            continue;
        }

        log(`\n  📦 ${skill.name} (owner: @${skill.owner})`);

        for (const ver of skill.versions) {
            const tarball = makeFakeTarball(skill.name, ver.version);

            const res = await apiPost(
                '/api/publish',
                {
                    name: skill.name,
                    version: ver.version,
                    description: skill.description,
                    keywords: skill.keywords,
                    tag: ver.version === skill.versions.at(-1)?.version ? 'latest' : ver.version,
                    tarball,
                    readme: ver.readme,
                    skill_json: ver.skill_json,
                },
                token,
            );

            if (res.success) {
                log(`     ✅ v${ver.version} 发布成功`);
            } else if (res.error?.includes('already published')) {
                log(`     ℹ️  v${ver.version} 已存在，跳过`);
            } else {
                log(`     ❌ v${ver.version} 发布失败: ${JSON.stringify(res)}`);
            }
        }
    }

    // 3. 模拟下载事件（直接通过 DB 写入，用于展示下载统计图表）
    logSection('模拟下载统计数据');
    await seedDownloadEvents();

    // 4. 验证数据
    logSection('验证：搜索接口');
    const searchRes = await fetch(`${BASE_URL}/api/search?q=docker`).then((r) => r.json());
    log(`搜索 "docker" → ${searchRes.total ?? searchRes.results?.length ?? 0} 条结果`);

    const listRes = await fetch(`${BASE_URL}/api/skills`).then((r) => r.json());
    log(`全部 skills → ${listRes.skills?.length ?? 0} 条`);

    console.log(`\n${'═'.repeat(50)}`);
    console.log(`✅ 种子数据写入完成！`);
    console.log(`\n   测试账号:`);
    for (const user of USERS) {
        console.log(`     ${user.email} / ${user.password}`);
    }
    console.log(`\n   可访问: ${BASE_URL}`);
    console.log(`${'═'.repeat(50)}\n`);
}

async function seedDownloadEvents() {
    // 直接通过 postgres 写入下载事件（绕过 HTTP，模拟历史数据）
    const { sql } = await import('../src/db/client.js');

    // 先获取所有 skill IDs
    const skills = await sql<{ id: string; name: string }[]>`
        SELECT id, name FROM skills ORDER BY created_at
    `;

    if (skills.length === 0) {
        log('⚠️  没有 skill 数据，跳过下载事件生成');
        return;
    }

    let totalInserted = 0;
    const now = new Date();

    for (const skill of skills) {
        // 为每个 skill 生成过去 30 天的随机下载数据
        const baseDownloads = Math.floor(Math.random() * 200) + 50; // 50-250 次/总量
        const events: Array<{ time: Date; version: string }> = [];

        for (let day = 0; day < 30; day++) {
            const date = new Date(now);
            date.setDate(date.getDate() - day);

            // 随机每天 0-20 次下载，越近下载越多（模拟增长趋势）
            const dailyCount = Math.floor(Math.random() * (20 - day * 0.3));
            for (let i = 0; i < dailyCount; i++) {
                const eventTime = new Date(date);
                eventTime.setHours(Math.floor(Math.random() * 24));
                events.push({ time: eventTime, version: '1.0.0' });
            }
        }

        if (events.length > 0) {
            // 批量插入
            await sql`
                INSERT INTO download_events (time, skill_id, version)
                SELECT
                    unnest(${sql.array(events.map((e) => e.time))}::timestamptz[]),
                    ${skill.id}::uuid,
                    '1.0.0'
            `;
            // 更新总下载数
            await sql`
                UPDATE skills SET downloads_total = downloads_total + ${events.length}
                WHERE id = ${skill.id}
            `;
            totalInserted += events.length;
        }
    }

    log(`✅ 插入 ${totalInserted} 条下载事件（覆盖 ${skills.length} 个 skills，近 30 天）`);

    await sql.end();
}

seed().catch((err) => {
    console.error('❌ 种子脚本执行失败:', err);
    process.exit(1);
});

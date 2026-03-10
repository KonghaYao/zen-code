#!/usr/bin/env bun
/**
 * SkillPkg CLI — skillpkg command
 * Usage: skillpkg <command> [args] [options]
 */

import { installSkill, installFromLockfile } from './commands/install.js';
import { publishSkill } from './commands/publish.js';
import { searchSkills } from './commands/search.js';
import { login, logout, createToken, whoami } from './commands/auth.js';
import { initSkill } from './commands/init.js';
import { removeSkill } from './commands/remove.js';
import { outdated } from './commands/outdated.js';
import { readConfig, updateConfig } from './config.js';

const [, , command, ...args] = process.argv;

function parseFlags(args: string[]): { flags: Record<string, string | boolean>; positional: string[] } {
    const flags: Record<string, string | boolean> = {};
    const positional: string[] = [];
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--')) {
            const key = arg.slice(2);
            const next = args[i + 1];
            if (next && !next.startsWith('--')) {
                flags[key] = next;
                i++;
            } else {
                flags[key] = true;
            }
        } else {
            positional.push(arg);
        }
    }
    return { flags, positional };
}

async function main() {
    const { flags, positional } = parseFlags(args);

    switch (command) {
        case 'install':
        case 'i': {
            const name = positional[0];
            if (name) {
                await installSkill(name);
            } else {
                await installFromLockfile();
            }
            break;
        }

        case 'publish':
        case 'pub': {
            await publishSkill({ tag: flags.tag as string | undefined });
            break;
        }

        case 'search':
        case 's': {
            const query = positional.join(' ');
            if (!query) {
                console.error('Usage: skillpkg search <query>');
                process.exit(1);
            }
            await searchSkills(query);
            break;
        }

        case 'init': {
            await initSkill();
            break;
        }

        case 'remove':
        case 'rm':
        case 'uninstall': {
            const name = positional[0];
            if (!name) {
                console.error('Usage: skillpkg remove <name>');
                process.exit(1);
            }
            await removeSkill(name);
            break;
        }

        case 'outdated': {
            await outdated();
            break;
        }

        case 'update': {
            const name = positional[0];
            if (name) {
                await installSkill(`${name}@latest`);
            } else {
                // Update all
                const { readLockfile } = await import('./lockfile/index.js');
                const lockfile = await readLockfile();
                if (!lockfile) {
                    console.log('No skills installed.');
                    break;
                }
                for (const name of Object.keys(lockfile.skills)) {
                    await installSkill(`${name}@latest`).catch((e) =>
                        console.error(`Failed to update ${name}: ${(e as Error).message}`),
                    );
                }
            }
            break;
        }

        case 'login': {
            await login();
            break;
        }

        case 'logout': {
            await logout();
            break;
        }

        case 'whoami': {
            await whoami();
            break;
        }

        case 'token': {
            const sub = positional[0];
            if (sub === 'create') {
                const name = positional[1] ?? 'my-token';
                await createToken(name);
            } else {
                console.log('Usage: skillpkg token create [name]');
            }
            break;
        }

        case 'lock': {
            // Regenerate lockfile from current installs
            console.log('skills.lock is maintained automatically during install.');
            break;
        }

        case 'config': {
            const sub = positional[0];
            if (sub === 'set-registry') {
                const url = positional[1];
                if (!url) {
                    console.error('Usage: skillpkg config set-registry <url>');
                    process.exit(1);
                }
                await updateConfig({ registry: url });
                console.log(`Registry set to: ${url}`);
            } else {
                const config = await readConfig();
                console.log(JSON.stringify(config, null, 2));
            }
            break;
        }

        case '--version':
        case '-v':
        case 'version': {
            console.log('skillpkg-cli v1.0.0');
            break;
        }

        default: {
            console.log(`
SkillPkg CLI — AI Skill Package Manager

Usage: skillpkg <command> [options]

Commands:
  install <name[@version]>   Install a skill to .claude/skills/
  install                    Restore from skills.lock
  search <query>             Search the registry
  publish [--tag <tag>]      Publish current directory as a skill
  init                       Initialize skill.json + SKILL.md
  update [name]              Update skill(s) to latest
  outdated                   List skills with available updates
  remove <name>              Uninstall a skill
  lock                       Refresh skills.lock

Authentication:
  login                      Log in to the registry
  logout                     Log out
  whoami                     Show current user
  token create [name]        Create an API token

Config:
  config set-registry <url>  Set registry URL
  config                     Show current config

Examples:
  skillpkg install codebase-exploration
  skillpkg install codebase-exploration@1.2.3
  skillpkg search react
  skillpkg publish --tag latest
`);
            break;
        }
    }
}

main().catch((err) => {
    console.error(`\n❌ Error: ${err.message}`);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
});

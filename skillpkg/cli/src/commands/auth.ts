import { apiRequest } from '../client/api.js';
import { readConfig, updateConfig } from '../config.js';

export async function login(): Promise<void> {
    // Prompt for email and password
    process.stdout.write('Email: ');
    const email = await readLine();

    process.stdout.write('Password: ');
    const password = await readLineSecret();

    console.log('\nLogging in...');

    const result = await apiRequest<{
        token: string;
        user: { id: string; username: string; email: string };
    }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });

    await updateConfig({ token: result.token, username: result.user.username });
    console.log(`✅ Logged in as ${result.user.username}`);
}

export async function logout(): Promise<void> {
    await updateConfig({ token: undefined, username: undefined });
    console.log('✅ Logged out');
}

export async function createToken(name: string): Promise<void> {
    const config = await readConfig();
    if (!config.token) {
        console.error('Not logged in. Run: skillpkg login');
        process.exit(1);
    }

    const result = await apiRequest<{
        token: string;
        id: string;
        name: string;
    }>('/api/auth/token', {
        method: 'POST',
        body: JSON.stringify({ name }),
    });

    console.log(`\n✅ API Token created: ${result.name}`);
    console.log(`\nToken (save this - it won't be shown again):`);
    console.log(`\n  ${result.token}\n`);
    console.log('Use with: export SKILLPKG_TOKEN=<token>');
    console.log('Or add to ~/.skillpkg/config.json');
}

export async function whoami(): Promise<void> {
    const config = await readConfig();
    if (!config.username) {
        console.log('Not logged in. Run: skillpkg login');
    } else {
        console.log(`Logged in as: ${config.username}`);
        console.log(`Registry: ${config.registry ?? 'https://registry.skillpkg.dev'}`);
    }
}

// Simple readline utilities for Bun
async function readLine(): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of Bun.stdin.stream()) {
        const buf = Buffer.from(chunk);
        const nl = buf.indexOf(10); // newline
        if (nl >= 0) {
            chunks.push(buf.slice(0, nl));
            break;
        }
        chunks.push(buf);
    }
    return Buffer.concat(chunks).toString('utf8').trim();
}

async function readLineSecret(): Promise<string> {
    // In real impl would disable echo; for simplicity same as readLine
    return readLine();
}

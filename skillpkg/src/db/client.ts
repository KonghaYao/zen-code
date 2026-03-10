import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://skillpkg:skillpkg_secret@localhost:5432/skillpkg';

export const sql = postgres(DATABASE_URL, {
    max: 20,
    idle_timeout: 30,
    connect_timeout: 10,
    onnotice: () => {},
});

export async function checkConnection(): Promise<void> {
    await sql`SELECT 1`;
    console.log('[DB] Connected to TimescaleDB');
}

import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'skillpkg_dev_secret_change_in_production';
const JWT_EXPIRES = '7d';

export interface JwtPayload {
    userId: string;
    username: string;
    email: string;
}

export function signJwt(payload: JwtPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyJwt(token: string): JwtPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch {
        return null;
    }
}

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export function generateApiToken(): string {
    return `skp_${randomBytes(32).toString('hex')}`;
}

export function hashApiToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

export function extractBearerToken(authHeader: string | null): string | null {
    if (!authHeader?.startsWith('Bearer ')) return null;
    return authHeader.slice(7);
}

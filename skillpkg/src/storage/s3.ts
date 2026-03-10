import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash } from 'node:crypto';

const S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://localhost:9000';
const S3_BUCKET = process.env.S3_BUCKET || 'skillpkg-skills';
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || 'skillpkg_minio';
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || 'skillpkg_minio_secret';
const S3_REGION = process.env.S3_REGION || 'us-east-1';
const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL || `${S3_ENDPOINT}/${S3_BUCKET}`;

export const s3Client = new S3Client({
    endpoint: S3_ENDPOINT,
    region: S3_REGION,
    credentials: {
        accessKeyId: S3_ACCESS_KEY,
        secretAccessKey: S3_SECRET_KEY,
    },
    forcePathStyle: true, // Required for MinIO
});

export function getPublicUrl(key: string): string {
    return `${S3_PUBLIC_URL}/${key}`;
}

export function getTarballKey(name: string, version: string): string {
    return `skills/${name}/${version}/skill.tar.gz`;
}

export function getMetaKey(name: string, version: string): string {
    return `skills/${name}/${version}/skill.json`;
}

export async function uploadTarball(
    name: string,
    version: string,
    buffer: Buffer,
): Promise<{ url: string; integrity: string }> {
    const key = getTarballKey(name, version);

    // Calculate SHA-512 integrity
    const hash = createHash('sha512').update(buffer).digest('base64');
    const integrity = `sha512-${hash}`;

    await s3Client.send(
        new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: 'application/gzip',
            Metadata: {
                integrity,
                'skill-name': name,
                'skill-version': version,
            },
        }),
    );

    return {
        url: getPublicUrl(key),
        integrity,
    };
}

export async function uploadMeta(name: string, version: string, meta: Record<string, unknown>): Promise<void> {
    const key = getMetaKey(name, version);
    const body = JSON.stringify(meta, null, 2);

    await s3Client.send(
        new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
            Body: body,
            ContentType: 'application/json',
        }),
    );
}

export async function getPresignedDownloadUrl(name: string, version: string): Promise<string> {
    const key = getTarballKey(name, version);
    const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
    return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export async function deleteTarball(name: string, version: string): Promise<void> {
    const key = getTarballKey(name, version);
    await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
}

export async function checkS3Connection(): Promise<void> {
    try {
        // Try to list objects with a small limit to verify connection
        const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
        await s3Client.send(new ListObjectsV2Command({ Bucket: S3_BUCKET, MaxKeys: 1 }));
        console.log('[S3] Connected to MinIO/S3');
    } catch (error) {
        console.warn('[S3] Warning: Could not connect to S3/MinIO:', (error as Error).message);
    }
}

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "./env.js";

let _client: S3Client | null = null;

export function isS3Configured(): boolean {
  return !!(env.AWS_S3_BUCKET_NAME && env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY);
}

function getClient(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: env.AWS_DEFAULT_REGION,
      endpoint: env.AWS_ENDPOINT_URL,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    });
  }
  return _client;
}

/** Generate a presigned PUT URL for client-side direct upload (10 min expiry) */
export async function generateUploadUrl(
  key: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(getClient(), command, { expiresIn: 600 });
}

// In-memory cache for download URLs (50 min TTL, presigned URLs last 1 hour)
const urlCache = new Map<string, { url: string; expiresAt: number }>();

/** Generate a presigned GET URL for serving assets (1 hour expiry, cached 50 min) */
export async function generateDownloadUrl(key: string): Promise<string> {
  const cached = urlCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const command = new GetObjectCommand({
    Bucket: env.AWS_S3_BUCKET_NAME,
    Key: key,
  });
  const url = await getSignedUrl(getClient(), command, { expiresIn: 3600 });

  urlCache.set(key, { url, expiresAt: Date.now() + 50 * 60 * 1000 });
  return url;
}

/** Delete an object from S3 */
export async function deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: env.AWS_S3_BUCKET_NAME,
    Key: key,
  });
  await getClient().send(command);
}

// server/storage.ts
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

const SIGNED_URL_EXPIRES_SECONDS = 60 * 60 * 24 * 7; // 7 days
const INLINE_STORAGE_PREFIX = "inline-db:";

function getClient() {
  return new S3Client({ region: ENV.s3Region });
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

export function isInlineStorageKey(fileKey: string): boolean {
  return fileKey.startsWith(INLINE_STORAGE_PREFIX);
}

function buildInlineStorageKey(relKey: string): string {
  return `${INLINE_STORAGE_PREFIX}${normalizeKey(relKey)}`;
}

function buildInlineStorageUrl(fileKey: string): string {
  return `/api/files/${encodeURIComponent(fileKey)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  if (!ENV.s3Bucket) {
    const key = buildInlineStorageKey(relKey);
    return {
      key,
      url: buildInlineStorageUrl(key),
    };
  }

  const key = normalizeKey(relKey);
  const client = getClient();
  const body =
    typeof data === "string" ? Buffer.from(data, "utf8") : (data as Buffer);

  await client.send(
    new PutObjectCommand({
      Bucket: ENV.s3Bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: ENV.s3Bucket, Key: key }),
    { expiresIn: SIGNED_URL_EXPIRES_SECONDS }
  );

  return { key, url };
}

export async function storageGet(
  relKey: string
): Promise<{ key: string; url: string }> {
  if (isInlineStorageKey(relKey)) {
    return {
      key: relKey,
      url: buildInlineStorageUrl(relKey),
    };
  }

  if (!ENV.s3Bucket) {
    const key = buildInlineStorageKey(relKey);
    return {
      key,
      url: buildInlineStorageUrl(key),
    };
  }

  const key = normalizeKey(relKey);
  const client = getClient();
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: ENV.s3Bucket, Key: key }),
    { expiresIn: SIGNED_URL_EXPIRES_SECONDS }
  );

  return { key, url };
}

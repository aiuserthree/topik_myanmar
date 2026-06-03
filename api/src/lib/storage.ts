import crypto from "node:crypto";
import { promises as fs, createReadStream } from "node:fs";
import path from "node:path";
import type { Readable } from "node:stream";
import { config } from "../config.js";

/**
 * Pluggable photo / file storage.
 *
 * STORAGE_PROVIDER:
 *   - "local" → write decoded bytes under UPLOAD_DIR (default api/var/uploads),
 *               served via GET /api/v1/files/:id. (default — works with no creds)
 *   - "s3"    → upload to S3 (or S3-compatible) and serve via presigned GET URL.
 *               Requires S3_BUCKET/S3_REGION/S3_ACCESS_KEY/S3_SECRET (+ optional
 *               S3_ENDPOINT/S3_PREFIX). If any are missing we fall back to local
 *               with a warning (mirrors the mailer console fallback). No invented
 *               credentials.
 *
 * storage_key is provider-tagged so retrieval knows how to resolve it:
 *   - local:  "local:<relative/path.jpg>"
 *   - s3:     "s3:<object/key.jpg>"
 *   - legacy: "stub://..." rows (pre-real-storage) resolve to NOT_FOUND.
 */

export type StorageMode = "local" | "s3";

interface Querier {
  query: (
    text: string,
    params?: unknown[]
  ) => Promise<{ rows: Array<Record<string, unknown>> }>;
}

export interface SavePhotoInput {
  /** file_attachments.owner_type — currently always 'user_photo' for photos. */
  ownerType: "user_photo" | "board" | "notice";
  /** file_attachments.owner_id (user id; 0 for pre-registration signup). */
  ownerId: number;
  /** Raw base64 or data URL (data:image/jpeg;base64,....). */
  base64: string;
  /** Stored as original_filename. */
  filename?: string;
}

export interface SavedFile {
  fileId: number;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
}

export interface FileRow {
  id: number;
  storage_key: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  owner_type: string;
  owner_id: number;
}

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

let warnedS3Fallback = false;

/** Effective storage mode after credential validation (s3 → local fallback). */
export function storageMode(): StorageMode {
  if (config.storage.provider === "s3") {
    const s3 = config.storage.s3;
    if (s3.bucket && s3.region && s3.accessKeyId && s3.secretAccessKey) {
      return "s3";
    }
    if (!warnedS3Fallback) {
      warnedS3Fallback = true;
      // eslint-disable-next-line no-console
      console.warn(
        "[storage] STORAGE_PROVIDER=s3 but S3_BUCKET/S3_REGION/S3_ACCESS_KEY/S3_SECRET incomplete — falling back to local disk."
      );
    }
  }
  return "local";
}

/** True when a real cloud provider (not local disk) is active. */
export function isCloudStorage(): boolean {
  return storageMode() === "s3";
}

function resolveUploadDir(): string {
  const dir = config.storage.uploadDir;
  return path.isAbsolute(dir) ? dir : path.resolve(process.cwd(), dir);
}

/** Decode a base64 string or data URL into bytes + detected mime. */
export function decodeBase64Image(raw: string): { buffer: Buffer; mime: string } {
  let mime = "image/jpeg";
  let data = raw;
  const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(raw);
  if (m) {
    mime = m[1] || mime;
    data = m[3] ?? "";
  }
  const buffer = Buffer.from(data, "base64");
  if (!EXT_BY_MIME[mime]) mime = "image/jpeg";
  return { buffer, mime };
}

async function getS3Client(): Promise<{
  client: unknown;
  PutObjectCommand: new (i: unknown) => unknown;
  GetObjectCommand: new (i: unknown) => unknown;
  getSignedUrl: (c: unknown, cmd: unknown, o: unknown) => Promise<string>;
} | null> {
  // Non-literal specifiers so tsc does not require the AWS SDK types at build
  // time; degrade gracefully (→ runtime error / local fallback) if not installed.
  const clientSpec = "@aws-sdk/client-s3";
  const presignSpec = "@aws-sdk/s3-request-presigner";
  const s3mod = await import(clientSpec).catch(() => null);
  const presignMod = await import(presignSpec).catch(() => null);
  if (!s3mod || !presignMod) return null;
  const s3 = config.storage.s3;
  const S3Client = (s3mod as Record<string, unknown>).S3Client as new (
    o: unknown
  ) => unknown;
  const client = new S3Client({
    region: s3.region,
    endpoint: s3.endpoint || undefined,
    forcePathStyle: !!s3.endpoint,
    credentials: {
      accessKeyId: s3.accessKeyId,
      secretAccessKey: s3.secretAccessKey,
    },
  });
  return {
    client,
    PutObjectCommand: (s3mod as Record<string, unknown>)
      .PutObjectCommand as new (i: unknown) => unknown,
    GetObjectCommand: (s3mod as Record<string, unknown>)
      .GetObjectCommand as new (i: unknown) => unknown,
    getSignedUrl: (presignMod as Record<string, unknown>)
      .getSignedUrl as (c: unknown, cmd: unknown, o: unknown) => Promise<string>,
  };
}

function s3KeyFor(ownerId: number, ext: string): string {
  const prefix = config.storage.s3.prefix;
  const base = `photos/${ownerId || "signup"}/${Date.now()}-${crypto
    .randomBytes(6)
    .toString("hex")}.${ext}`;
  return prefix ? `${prefix}/${base}` : base;
}

/**
 * Decode + persist a photo, insert the file_attachments row, return its id.
 * Throws on oversized / empty payloads so callers can surface a 400.
 */
export async function savePhoto(
  db: Querier,
  input: SavePhotoInput
): Promise<SavedFile> {
  const { buffer, mime } = decodeBase64Image(input.base64);
  if (buffer.length === 0) {
    throw new StorageError("EMPTY_FILE", "이미지 데이터가 비어 있습니다.");
  }
  if (buffer.length > config.storage.maxBytes) {
    throw new StorageError(
      "FILE_TOO_LARGE",
      `이미지 용량이 너무 큽니다. (최대 ${Math.floor(
        config.storage.maxBytes / (1024 * 1024)
      )}MB)`
    );
  }
  const ext = EXT_BY_MIME[mime] ?? "jpg";
  const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
  const filename = input.filename ?? `photo.${ext}`;

  let storageKey: string;
  if (storageMode() === "s3") {
    const sdk = await getS3Client();
    if (!sdk) {
      // SDK missing despite s3 selected — fall back to local rather than fail.
      storageKey = await writeLocal(input.ownerId, ext, buffer);
    } else {
      const key = s3KeyFor(input.ownerId, ext);
      await sdk.getSignedUrl; // keep reference (no-op) — presign used on read
      const cmd = new sdk.PutObjectCommand({
        Bucket: config.storage.s3.bucket,
        Key: key,
        Body: buffer,
        ContentType: mime,
      });
      // S3Client.send
      await (sdk.client as { send: (c: unknown) => Promise<unknown> }).send(cmd);
      storageKey = `s3:${key}`;
    }
  } else {
    storageKey = await writeLocal(input.ownerId, ext, buffer);
  }

  const ins = await db.query(
    `INSERT INTO file_attachments (
       owner_type, owner_id, storage_key, original_filename,
       mime_type, size_bytes, checksum_sha256
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      input.ownerType,
      input.ownerId,
      storageKey,
      filename,
      mime,
      buffer.length,
      checksum,
    ]
  );
  return {
    fileId: Number(ins.rows[0].id),
    storageKey,
    mimeType: mime,
    sizeBytes: buffer.length,
  };
}

async function writeLocal(
  ownerId: number,
  ext: string,
  buffer: Buffer
): Promise<string> {
  const root = resolveUploadDir();
  const sub = path.join("photos", String(ownerId || "signup"));
  const dir = path.join(root, sub);
  await fs.mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  await fs.writeFile(path.join(dir, name), buffer);
  // Store a POSIX-style relative key regardless of host OS.
  const rel = path.join(sub, name).split(path.sep).join("/");
  return `local:${rel}`;
}

export interface ResolvedFile {
  kind: "buffer" | "stream" | "redirect";
  mime: string;
  filename: string;
  buffer?: Buffer;
  stream?: Readable;
  redirectUrl?: string;
}

/**
 * Resolve a file_attachments row to deliverable content.
 *  - local → fs read stream
 *  - s3    → presigned GET URL (302 redirect) or object stream fallback
 *  - legacy stub:// → null (NOT_FOUND)
 */
export async function resolveFile(row: FileRow): Promise<ResolvedFile | null> {
  const key = String(row.storage_key ?? "");
  const mime = row.mime_type || "application/octet-stream";
  const filename = row.original_filename || "file";

  if (key.startsWith("local:")) {
    const rel = key.slice("local:".length);
    const abs = path.join(resolveUploadDir(), rel);
    try {
      await fs.access(abs);
    } catch {
      return null;
    }
    return { kind: "stream", mime, filename, stream: createReadStream(abs) };
  }

  if (key.startsWith("s3:")) {
    const objectKey = key.slice("s3:".length);
    const sdk = await getS3Client();
    if (!sdk) return null;
    try {
      const cmd = new sdk.GetObjectCommand({
        Bucket: config.storage.s3.bucket,
        Key: objectKey,
      });
      const url = await sdk.getSignedUrl(sdk.client, cmd, { expiresIn: 300 });
      return { kind: "redirect", mime, filename, redirectUrl: url };
    } catch {
      return null;
    }
  }

  // legacy stub:// or unknown scheme
  return null;
}

/**
 * Read a stored file fully into a Buffer (used by ZIP/Excel export).
 * Returns null for legacy stub rows or missing objects.
 */
export async function readFileBuffer(row: FileRow): Promise<Buffer | null> {
  const key = String(row.storage_key ?? "");
  if (key.startsWith("local:")) {
    const abs = path.join(resolveUploadDir(), key.slice("local:".length));
    try {
      return await fs.readFile(abs);
    } catch {
      return null;
    }
  }
  if (key.startsWith("s3:")) {
    const sdk = await getS3Client();
    if (!sdk) return null;
    try {
      const cmd = new sdk.GetObjectCommand({
        Bucket: config.storage.s3.bucket,
        Key: key.slice("s3:".length),
      });
      const res = (await (
        sdk.client as { send: (c: unknown) => Promise<unknown> }
      ).send(cmd)) as { Body?: Readable };
      if (!res.Body) return null;
      const chunks: Buffer[] = [];
      for await (const chunk of res.Body) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    } catch {
      return null;
    }
  }
  return null;
}

export class StorageError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

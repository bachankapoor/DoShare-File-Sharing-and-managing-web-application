import { createHash, randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

/**
 * StorageProvider is the seam between business logic and wherever bytes
 * actually live. v1 ships a local-filesystem implementation; swapping in
 * S3 (or anything else) means implementing this interface only — nothing
 * in the domain layer should ever touch `fs` directly.
 */
export interface StorageRef {
  key: string;
}

export interface FileMetadata {
  sizeBytes: number;
  hash: string;
}

export interface StorageProvider {
  upload(buffer: Buffer, suggestedName: string): Promise<{ ref: StorageRef; meta: FileMetadata }>;
  download(ref: StorageRef): Promise<Buffer>;
  delete(ref: StorageRef): Promise<void>;
  metadata(ref: StorageRef): Promise<FileMetadata>;
  /**
   * Returns a short-lived, single-purpose access descriptor. In the local
   * implementation this is just a signed internal route; a cloud
   * implementation would return a real presigned URL.
   */
  generateTemporaryAccess(ref: StorageRef, ttlSeconds: number): Promise<{ url: string; expiresAt: Date }>;
}

const ROOT = process.env.STORAGE_ROOT ?? "./.storage";

class LocalStorageProvider implements StorageProvider {
  private async ensureRoot() {
    await fs.mkdir(ROOT, { recursive: true });
  }

  async upload(buffer: Buffer, suggestedName: string) {
    await this.ensureRoot();
    // Storage keys are server-generated, never derived from the
    // user-supplied filename, to avoid path traversal / collisions.
    const ext = path.extname(suggestedName).slice(0, 10);
    const key = `${randomUUID()}${ext}`;
    await fs.writeFile(path.join(ROOT, key), buffer);
    const hash = createHash("sha256").update(buffer).digest("hex");
    return { ref: { key }, meta: { sizeBytes: buffer.length, hash } };
  }

  async download(ref: StorageRef) {
    return fs.readFile(path.join(ROOT, ref.key));
  }

  async delete(ref: StorageRef) {
    await fs.rm(path.join(ROOT, ref.key), { force: true });
  }

  async metadata(ref: StorageRef) {
    const buf = await this.download(ref);
    return { sizeBytes: buf.length, hash: createHash("sha256").update(buf).digest("hex") };
  }

  async generateTemporaryAccess(ref: StorageRef, ttlSeconds: number) {
    // Local dev stand-in: the real route re-checks the Policy Engine on
    // every hit, so this "url" is not itself a bearer credential.
    return {
      url: `/api/documents/access/${encodeURIComponent(ref.key)}`,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    };
  }
}

export const storage: StorageProvider = new LocalStorageProvider();

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser, AuthError } from "@/lib/auth";
import { storage } from "@/lib/storage";

const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25MB — generous for the documents this product targets
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const documents = await prisma.document.findMany({
      where: { ownerId: user.id, status: { not: "DELETED" } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(documents);
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    throw e;
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "File must be under 25MB" }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const detectedType = detectType(buffer, file.type);
    if (!ALLOWED_TYPES.has(detectedType)) {
      return NextResponse.json(
        { error: "Unsupported file type. Upload a PDF, PNG, JPEG, or WEBP." },
        { status: 415 }
      );
    }

    const { ref, meta } = await storage.upload(buffer, file.name);

    const document = await prisma.document.create({
      data: {
        ownerId: user.id,
        name: sanitizeName(file.name),
        mimeType: detectedType,
        sizeBytes: meta.sizeBytes,
        storageRef: ref.key,
        hash: meta.hash,
        status: "AVAILABLE",
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    throw e;
  }
}

function sanitizeName(name: string) {
  // Display name only — never used to derive a storage path.
  return name.replace(/[\/\\]/g, "_").slice(0, 150);
}

/** Minimal magic-byte sniff so we don't trust the client-reported MIME type. */
function detectType(buf: Buffer, reported: string): string {
  if (buf.subarray(0, 4).toString("ascii") === "%PDF") return "application/pdf";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return "image/png";
  if (buf.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return "image/jpeg";
  if (buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return reported;
}

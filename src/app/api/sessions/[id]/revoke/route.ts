import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser, AuthError } from "@/lib/auth";
import { revokeSession } from "@/lib/sessions";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    await revokeSession(id, user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

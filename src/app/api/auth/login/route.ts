import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createOwnerSession } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Deliberately generic error message — do not reveal whether the email
// exists (avoids account enumeration).
const BAD_CREDENTIALS = { error: "Incorrect email or password" };

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json(BAD_CREDENTIALS, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return NextResponse.json(BAD_CREDENTIALS, { status: 401 });

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) return NextResponse.json(BAD_CREDENTIALS, { status: 401 });

  if (user.status !== "ACTIVE") {
    return NextResponse.json({ error: "This account is suspended" }, { status: 403 });
  }

  await createOwnerSession(user.id);
  return NextResponse.json({ id: user.id, email: user.email });
}

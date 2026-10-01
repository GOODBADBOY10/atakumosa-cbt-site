import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { logAction } from "@/lib/audit";

const schema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);

    const [updated] = await db
      .update(users)
      .set({
        passwordHash,
        mustChangePassword: true,
        isLocked: false,
        failedLoginAttempts: 0,
      })
      .where(eq(users.id, id))
      .returning({ id: users.id, fullName: users.fullName });

    if (!updated) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    await logAction(session.user.id, "admin", "reset_admin_password", {
      targetAdminId: updated.id,
      targetAdminName: updated.fullName,
    });

    return NextResponse.json({ message: `Password reset for ${updated.fullName}` });
  } catch (err) {
    console.error("Failed to reset admin password:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
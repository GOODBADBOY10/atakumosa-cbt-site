import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

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

    await db
      .update(users)
      .set({ passwordHash, mustChangePassword: false })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Failed to change password:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
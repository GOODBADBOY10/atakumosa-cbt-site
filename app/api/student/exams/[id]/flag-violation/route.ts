import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { examAttempts } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id: examId } = await params;

  try {
    const [attempt] = await db
      .select()
      .from(examAttempts)
      .where(
        and(
          eq(examAttempts.examId, examId),
          eq(examAttempts.studentId, session.user.id)
        )
      );

    if (!attempt || attempt.submittedAt) {
      // Silently ignore - no active attempt to log against
      return NextResponse.json({ logged: false });
    }

    await db
      .update(examAttempts)
      .set({ tabSwitchCount: sql`${examAttempts.tabSwitchCount} + 1` })
      .where(eq(examAttempts.id, attempt.id));

    return NextResponse.json({ logged: true });
  } catch (err) {
    console.error("Failed to log violation:", err);
    return NextResponse.json({ logged: false });
  }
}
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { examAttempts, answers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const saveSchema = z.object({
  questionId: z.string().uuid(),
  studentAnswer: z.string(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id: examId } = await params;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

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

    if (!attempt) {
      return NextResponse.json({ error: "No active attempt found" }, { status: 404 });
    }

    if (attempt.submittedAt) {
      return NextResponse.json({ error: "Exam already submitted" }, { status: 409 });
    }

    // Upsert: check if answer already exists for this question
    const [existing] = await db
      .select()
      .from(answers)
      .where(
        and(
          eq(answers.attemptId, attempt.id),
          eq(answers.questionId, parsed.data.questionId)
        )
      );

    if (existing) {
      await db
        .update(answers)
        .set({ studentAnswer: parsed.data.studentAnswer })
        .where(eq(answers.id, existing.id));
    } else {
      await db.insert(answers).values({
        attemptId: attempt.id,
        questionId: parsed.data.questionId,
        studentAnswer: parsed.data.studentAnswer,
      });
    }

    return NextResponse.json({ saved: true });
  } catch (err) {
    console.error("Failed to save answer:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
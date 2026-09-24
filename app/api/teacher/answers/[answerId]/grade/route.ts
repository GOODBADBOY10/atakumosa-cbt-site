import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { answers, examAttempts, exams, questions } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { logAction } from "@/lib/audit";

const gradeSchema = z.object({
  pointsAwarded: z.number().int().min(0),
  teacherComment: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ answerId: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { answerId } = await params;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = gradeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    // Ownership check: this answer's exam must belong to this teacher
    const [answerRow] = await db
      .select({
        id: answers.id,
        attemptId: answers.attemptId,
        examId: examAttempts.examId,
        createdBy: exams.createdBy,
      })
      .from(answers)
      .innerJoin(examAttempts, eq(answers.attemptId, examAttempts.id))
      .innerJoin(exams, eq(examAttempts.examId, exams.id))
      .where(eq(answers.id, answerId));

    if (!answerRow || answerRow.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: "You don't have permission to grade this answer" },
        { status: 403 }
      );
    }

    await db
      .update(answers)
      .set({
        pointsAwarded: parsed.data.pointsAwarded,
        isCorrect: parsed.data.pointsAwarded > 0,
        teacherComment: parsed.data.teacherComment || null,
      })
      .where(eq(answers.id, answerId));

    // Recalculate the attempt's total score from all answers
    const allAnswers = await db
      .select({ pointsAwarded: answers.pointsAwarded })
      .from(answers)
      .where(eq(answers.attemptId, answerRow.attemptId));

    const newScore = allAnswers.reduce((sum, a) => sum + (a.pointsAwarded || 0), 0);

    // Check if all essay questions in this attempt are now graded
    const ungraded = await db
      .select({ id: answers.id })
      .from(answers)
      .innerJoin(questions, eq(answers.questionId, questions.id))
      .where(
        and(
          eq(answers.attemptId, answerRow.attemptId),
          eq(questions.type, "essay"),
          sql`${answers.pointsAwarded} IS NULL`
        )
      );

    await db
      .update(examAttempts)
      .set({
        score: newScore,
        gradingComplete: ungraded.length === 0,
      })
      .where(eq(examAttempts.id, answerRow.attemptId));

    await logAction(session.user.id, "teacher", "graded_answer", {
      answerId,
      pointsAwarded: parsed.data.pointsAwarded,
    });

    return NextResponse.json({ message: "Graded successfully", newScore });
  } catch (err) {
    console.error("Failed to grade answer:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
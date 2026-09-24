import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { examAttempts, answers, questions, examQuestions } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";

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

    if (!attempt) {
      return NextResponse.json({ error: "No active attempt found" }, { status: 404 });
    }

    if (attempt.submittedAt) {
      return NextResponse.json({ error: "Exam already submitted" }, { status: 409 });
    }

    // Get all questions for this exam with their correct answers (server-side only)
    const examQs = await db
      .select({ questionId: examQuestions.questionId })
      .from(examQuestions)
      .where(eq(examQuestions.examId, examId));

    const questionIds = examQs.map((q) => q.questionId);

    const fullQuestions = await db
      .select()
      .from(questions)
      .where(inArray(questions.id, questionIds));

    const studentAnswers = await db
      .select()
      .from(answers)
      .where(eq(answers.attemptId, attempt.id));

    const answerMap = new Map(studentAnswers.map((a) => [a.questionId, a]));

    let score = 0;
    let totalObjective = 0;

    for (const q of fullQuestions) {
      const studentAnswer = answerMap.get(q.id);

      if (q.type === "essay") {
        continue; // graded manually later, not counted in auto-score
      }

      totalObjective += 1;

      const isCorrect =
        studentAnswer?.studentAnswer?.trim().toLowerCase() ===
        q.correctAnswer?.trim().toLowerCase();

      if (studentAnswer) {
        await db
          .update(answers)
          .set({
            isCorrect,
            pointsAwarded: isCorrect ? 1 : 0,
          })
          .where(eq(answers.id, studentAnswer.id));
      }

      if (isCorrect) score += 1;
    }

    const hasEssay = fullQuestions.some((q) => q.type === "essay");

    const [updatedAttempt] = await db
      .update(examAttempts)
      .set({
        submittedAt: new Date(),
        score,
        totalPossible: fullQuestions.length,
        gradingComplete: !hasEssay, // if no essay questions, grading is fully done
      })
      .where(eq(examAttempts.id, attempt.id))
      .returning();

    return NextResponse.json({
      message: "Exam submitted successfully",
      score,
      totalObjective,
      totalQuestions: fullQuestions.length,
      pendingManualGrading: hasEssay,
    });
  } catch (err) {
    console.error("Failed to submit exam:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { examAttempts, answers, questions, exams } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { attemptId } = await params;

  try {
    const [attempt] = await db
      .select()
      .from(examAttempts)
      .where(eq(examAttempts.id, attemptId));

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    // Confirm the exam this attempt belongs to was created by this teacher
    const [exam] = await db
      .select()
      .from(exams)
      .where(and(eq(exams.id, attempt.examId), eq(exams.createdBy, session.user.id)));

    if (!exam) {
      return NextResponse.json(
        { error: "You don't have permission to view this attempt" },
        { status: 403 }
      );
    }

    const results = await db
      .select({
        answerId: answers.id,
        questionId: answers.questionId,
        questionText: questions.questionText,
        type: questions.type,
        options: questions.options,
        correctAnswer: questions.correctAnswer,
        studentAnswer: answers.studentAnswer,
        isCorrect: answers.isCorrect,
        pointsAwarded: answers.pointsAwarded,
        teacherComment: answers.teacherComment,
      })
      .from(answers)
      .innerJoin(questions, eq(answers.questionId, questions.id))
      .where(eq(answers.attemptId, attemptId));

    return NextResponse.json({ attempt, answers: results });
  } catch (err) {
    console.error("Failed to fetch attempt detail:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
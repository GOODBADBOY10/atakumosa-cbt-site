import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  exams,
  examQuestions,
  questions,
  examAttempts,
  answers,
  studentClasses,
} from "@/lib/db/schema";
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
    // Confirm exam exists, is published, and student is in the right class
    const [exam] = await db.select().from(exams).where(eq(exams.id, examId));

    if (!exam || exam.status !== "published") {
      return NextResponse.json({ error: "Exam not available" }, { status: 404 });
    }

    const myClass = await db
      .select()
      .from(studentClasses)
      .where(
        and(
          eq(studentClasses.studentId, session.user.id),
          eq(studentClasses.classId, exam.classId)
        )
      );

    if (myClass.length === 0) {
      return NextResponse.json(
        { error: "You are not enrolled in the class this exam is for" },
        { status: 403 }
      );
    }

    const now = new Date();
    if (now < new Date(exam.startsAt) || now > new Date(exam.endsAt)) {
      return NextResponse.json(
        { error: "This exam is not currently open" },
        { status: 403 }
      );
    }

    // Check for existing attempt
    let [attempt] = await db
      .select()
      .from(examAttempts)
      .where(
        and(
          eq(examAttempts.examId, examId),
          eq(examAttempts.studentId, session.user.id)
        )
      );

    if (attempt && attempt.submittedAt) {
      return NextResponse.json(
        { error: "You have already submitted this exam" },
        { status: 409 }
      );
    }

    // Get exam questions
    const examQs = await db
      .select({
        questionId: examQuestions.questionId,
        order: examQuestions.order,
      })
      .from(examQuestions)
      .where(eq(examQuestions.examId, examId));

    const questionIds = examQs.map((q) => q.questionId);

    let finalOrder: string[];

    if (!attempt) {
      // First time starting: decide the order ONCE and store it, so a
      // refresh/resume later shows the same order instead of re-shuffling.
      finalOrder = exam.shuffleQuestions
        ? [...questionIds].sort(() => Math.random() - 0.5)
        : [...examQs].sort((a, b) => a.order - b.order).map((q) => q.questionId);

      [attempt] = await db
        .insert(examAttempts)
        .values({
          examId,
          studentId: session.user.id,
          questionOrder: finalOrder,
        })
        .returning();
    } else {
      // Resuming: reuse the order stored at creation time
      finalOrder =
        (attempt.questionOrder as string[] | null) ||
        [...examQs].sort((a, b) => a.order - b.order).map((q) => q.questionId);
    }

    const fullQuestions = await db
      .select({
        id: questions.id,
        questionText: questions.questionText,
        type: questions.type,
        options: questions.options,
        // deliberately NOT selecting correctAnswer - students must never receive this
      })
      .from(questions)
      .where(inArray(questions.id, questionIds));

    const questionMap = new Map(fullQuestions.map((q) => [q.id, q]));
    const orderedQuestions = finalOrder
      .map((qId) => questionMap.get(qId))
      .filter((q): q is NonNullable<typeof q> => Boolean(q));

    // Get any existing answers for this attempt
    const existingAnswers = await db
      .select()
      .from(answers)
      .where(eq(answers.attemptId, attempt.id));

    const answerMap = Object.fromEntries(
      existingAnswers.map((a) => [a.questionId, a.studentAnswer])
    );

    return NextResponse.json({
      attemptId: attempt.id,
      examTitle: exam.title,
      durationMinutes: exam.durationMinutes,
      startedAt: attempt.startedAt,
      endsAt: exam.endsAt,
      questions: orderedQuestions,
      savedAnswers: answerMap,
    });
  } catch (err) {
    console.error("Failed to start exam:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
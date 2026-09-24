import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { exams, examAttempts, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id: examId } = await params;

  try {
    // Confirm this exam belongs to this teacher
    const [exam] = await db
      .select()
      .from(exams)
      .where(and(eq(exams.id, examId), eq(exams.createdBy, session.user.id)));

    if (!exam) {
      return NextResponse.json(
        { error: "Exam not found or you don't have permission to view it" },
        { status: 404 }
      );
    }

    const attempts = await db
      .select({
        id: examAttempts.id,
        studentId: examAttempts.studentId,
        studentName: users.fullName,
        regNumber: users.regNumber,
        startedAt: examAttempts.startedAt,
        submittedAt: examAttempts.submittedAt,
        score: examAttempts.score,
        totalPossible: examAttempts.totalPossible,
        gradingComplete: examAttempts.gradingComplete,
        tabSwitchCount: examAttempts.tabSwitchCount,
      })
      .from(examAttempts)
      .innerJoin(users, eq(examAttempts.studentId, users.id))
      .where(eq(examAttempts.examId, examId));

    return NextResponse.json({ exam: { title: exam.title }, attempts });
  } catch (err) {
    console.error("Failed to fetch attempts:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
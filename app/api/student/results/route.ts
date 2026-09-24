import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { examAttempts, exams, subjects } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const results = await db
      .select({
        attemptId: examAttempts.id,
        examTitle: exams.title,
        subjectName: subjects.name,
        score: examAttempts.score,
        totalPossible: examAttempts.totalPossible,
        gradingComplete: examAttempts.gradingComplete,
        resultsReleased: exams.resultsReleased,
        submittedAt: examAttempts.submittedAt,
      })
      .from(examAttempts)
      .innerJoin(exams, eq(examAttempts.examId, exams.id))
      .innerJoin(subjects, eq(exams.subjectId, subjects.id))
      .where(
        and(
          eq(examAttempts.studentId, session.user.id)
        )
      );

    // Only return score data if released - otherwise strip it
    const filtered = results
      .filter((r) => r.submittedAt !== null)
      .map((r) => ({
        examTitle: r.examTitle,
        subjectName: r.subjectName,
        submittedAt: r.submittedAt,
        resultsReleased: r.resultsReleased,
        score: r.resultsReleased ? r.score : null,
        totalPossible: r.resultsReleased ? r.totalPossible : null,
        gradingComplete: r.gradingComplete,
      }));

    return NextResponse.json(filtered);
  } catch (err) {
    console.error("Failed to fetch results:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
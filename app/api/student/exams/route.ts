import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { exams, studentClasses, examAttempts, subjects } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const myClasses = await db
      .select({ classId: studentClasses.classId })
      .from(studentClasses)
      .where(eq(studentClasses.studentId, session.user.id));

    const classIds = myClasses.map((c) => c.classId);

    if (classIds.length === 0) {
      return NextResponse.json([]);
    }

    const relevantExams = await db
      .select({
        id: exams.id,
        title: exams.title,
        subjectName: subjects.name,
        classId: exams.classId,
        durationMinutes: exams.durationMinutes,
        startsAt: exams.startsAt,
        endsAt: exams.endsAt,
        status: exams.status,
      })
      .from(exams)
      .innerJoin(subjects, eq(exams.subjectId, subjects.id))
      .where(
        and(eq(exams.status, "published"), inArray(exams.classId, classIds))
      );

    const attempts = await db
      .select({ examId: examAttempts.examId, submittedAt: examAttempts.submittedAt })
      .from(examAttempts)
      .where(eq(examAttempts.studentId, session.user.id));

    const attemptMap = new Map(attempts.map((a) => [a.examId, a.submittedAt]));

    const result = relevantExams.map((exam) => ({
      ...exam,
      alreadySubmitted: attemptMap.has(exam.id) && attemptMap.get(exam.id) !== null,
      inProgress: attemptMap.has(exam.id) && attemptMap.get(exam.id) === null,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to fetch student exams:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { exams, studentClasses, examAttempts, subjects } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";

// Nigeria is UTC+1 with no DST, so we compare calendar dates in that zone
// rather than the server's own timezone (which may differ once deployed).
function getDateKeyInLagos(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date); // "en-CA" gives YYYY-MM-DD directly
}

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

    // Only keep exams whose scheduled date is TODAY (Africa/Lagos calendar day)
    const todayKey = getDateKeyInLagos(new Date());
    const todaysExams = relevantExams.filter(
      (exam) => getDateKeyInLagos(new Date(exam.startsAt)) === todayKey
    );

    const attempts = await db
      .select({ examId: examAttempts.examId, submittedAt: examAttempts.submittedAt })
      .from(examAttempts)
      .where(eq(examAttempts.studentId, session.user.id));

    const attemptMap = new Map(attempts.map((a) => [a.examId, a.submittedAt]));

    const result = todaysExams.map((exam) => ({
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
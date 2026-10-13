import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { exams, subjects, classes, users, examAttempts, examQuestions } from "@/lib/db/schema";
import { eq, desc, count } from "drizzle-orm";

export async function GET() {
    const session = await auth();
    if (session?.user?.role !== "super_admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const rows = await db
            .select({
                id: exams.id,
                title: exams.title,
                status: exams.status,
                startsAt: exams.startsAt,
                endsAt: exams.endsAt,
                resultsReleased: exams.resultsReleased,
                subjectName: subjects.name,
                className: classes.name,
                teacherName: users.fullName,
            })
            .from(exams)
            .innerJoin(subjects, eq(exams.subjectId, subjects.id))
            .innerJoin(classes, eq(exams.classId, classes.id))
            .innerJoin(users, eq(exams.createdBy, users.id))
            .orderBy(desc(exams.startsAt));

        const attempts = await db
            .select({
                examId: examAttempts.examId,
                started: count(),
                submitted: count(examAttempts.submittedAt),
            })
            .from(examAttempts)
            .groupBy(examAttempts.examId);

        const qCounts = await db
            .select({ examId: examQuestions.examId, n: count() })
            .from(examQuestions)
            .groupBy(examQuestions.examId);

        const attemptMap = new Map(attempts.map((a) => [a.examId, a]));
        const qMap = new Map(qCounts.map((q) => [q.examId, Number(q.n)]));

        return NextResponse.json(
            rows.map((r) => ({
                ...r,
                questionCount: qMap.get(r.id) ?? 0,
                started: Number(attemptMap.get(r.id)?.started ?? 0),
                submitted: Number(attemptMap.get(r.id)?.submitted ?? 0),
            }))
        );
    } catch (err) {
        console.error("Failed to load exams overview:", err);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  users,
  questions,
  exams,
  auditLogs,
  teacherAssignments,
  subjects,
  classes,
} from "@/lib/db/schema";
import { eq, desc, count } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const teachers = await db
      .select({ id: users.id, fullName: users.fullName, email: users.email })
      .from(users)
      .where(eq(users.role, "teacher"));

    const questionCounts = await db
      .select({ createdBy: questions.createdBy, n: count() })
      .from(questions)
      .groupBy(questions.createdBy);

    const examCounts = await db
      .select({ createdBy: exams.createdBy, n: count() })
      .from(exams)
      .groupBy(exams.createdBy);

    const assignments = await db
      .select({
        teacherId: teacherAssignments.teacherId,
        subjectName: subjects.name,
        className: classes.name,
      })
      .from(teacherAssignments)
      .innerJoin(subjects, eq(teacherAssignments.subjectId, subjects.id))
      .innerJoin(classes, eq(teacherAssignments.classId, classes.id));

    // Latest recorded action per user (from the most recent 3000 log entries)
    const recent = await db
      .select({ userId: auditLogs.userId, createdAt: auditLogs.createdAt })
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(3000);

    const lastActivity = new Map<string, Date>();
    for (const r of recent) {
      if (r.userId && !lastActivity.has(r.userId)) lastActivity.set(r.userId, r.createdAt);
    }

    const qMap = new Map(questionCounts.map((q) => [q.createdBy, Number(q.n)]));
    const eMap = new Map(examCounts.map((e) => [e.createdBy, Number(e.n)]));

    const result = teachers.map((t) => ({
      ...t,
      assignments: assignments
        .filter((a) => a.teacherId === t.id)
        .map((a) => `${a.subjectName} (${a.className})`),
      questionCount: qMap.get(t.id) ?? 0,
      examCount: eMap.get(t.id) ?? 0,
      lastActivity: lastActivity.get(t.id) ?? null,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to load teacher overview:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
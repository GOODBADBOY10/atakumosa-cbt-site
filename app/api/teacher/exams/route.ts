import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { exams, examQuestions, teacherAssignments, questions } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";

const examSchema = z.object({
  title: z.string().trim().min(3, "Title is required").max(150),
  subjectId: z.string().uuid(),
  classId: z.string().uuid(),
  durationMinutes: z.number().int().min(5, "Duration must be at least 5 minutes").max(300),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  shuffleQuestions: z.boolean().optional().default(true),
  questionIds: z.array(z.string().uuid()).min(1, "Select at least one question"),
});

async function teacherOwnsSubjectClass(teacherId: string, subjectId: string, classId: string) {
  const assignment = await db
    .select()
    .from(teacherAssignments)
    .where(
      and(
        eq(teacherAssignments.teacherId, teacherId),
        eq(teacherAssignments.subjectId, subjectId),
        eq(teacherAssignments.classId, classId)
      )
    )
    .limit(1);

  return assignment.length > 0;
}

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const myExams = await db
      .select()
      .from(exams)
      .where(eq(exams.createdBy, session.user.id));

    return NextResponse.json(myExams);
  } catch (err) {
    console.error("Failed to fetch exams:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = examSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const data = parsed.data;

  // Security check: teacher must be assigned to this exact subject+class combo
  const owns = await teacherOwnsSubjectClass(session.user.id, data.subjectId, data.classId);
  if (!owns) {
    return NextResponse.json(
      { error: "You are not assigned to this subject/class combination" },
      { status: 403 }
    );
  }

  // Date sanity check
  const startsAt = new Date(data.startsAt);
  const endsAt = new Date(data.endsAt);
  if (endsAt <= startsAt) {
    return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
  }

  // Confirm every selected question actually belongs to this subject AND was created by a teacher with access
  // (simplest safe check: question must belong to the selected subjectId)
  const validQuestions = await db
    .select({ id: questions.id })
    .from(questions)
    .where(
      and(
        eq(questions.subjectId, data.subjectId),
        inArray(questions.id, data.questionIds)
      )
    );

  if (validQuestions.length !== data.questionIds.length) {
    return NextResponse.json(
      { error: "One or more selected questions do not belong to this subject" },
      { status: 400 }
    );
  }

  try {
    const [newExam] = await db
      .insert(exams)
      .values({
        title: data.title,
        subjectId: data.subjectId,
        classId: data.classId,
        createdBy: session.user.id,
        durationMinutes: data.durationMinutes,
        startsAt,
        endsAt,
        shuffleQuestions: data.shuffleQuestions,
        status: "draft",
      })
      .returning();

    await db.insert(examQuestions).values(
      data.questionIds.map((qId, index) => ({
        examId: newExam.id,
        questionId: qId,
        order: index + 1,
      }))
    );

    return NextResponse.json(newExam);
  } catch (err) {
    console.error("Failed to create exam:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
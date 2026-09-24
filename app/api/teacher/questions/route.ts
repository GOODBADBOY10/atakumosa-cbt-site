import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { questions, teacherAssignments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const questionSchema = z.object({
  subjectId: z.string().uuid(),
  type: z.enum(["mcq", "true_false", "fill_blank", "essay"]),
  questionText: z.string().trim().min(3, "Question text is required"),
  options: z
    .object({
      A: z.string().optional(),
      B: z.string().optional(),
      C: z.string().optional(),
      D: z.string().optional(),
    })
    .optional(),
  correctAnswer: z.string().optional(),
  topic: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
});

// Helper: confirm this teacher is actually assigned to this subject
async function teacherOwnsSubject(teacherId: string, subjectId: string) {
  const assignment = await db
    .select()
    .from(teacherAssignments)
    .where(
      and(
        eq(teacherAssignments.teacherId, teacherId),
        eq(teacherAssignments.subjectId, subjectId)
      )
    )
    .limit(1);

  return assignment.length > 0;
}

export async function GET(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get("subjectId");

  if (!subjectId) {
    return NextResponse.json({ error: "subjectId is required" }, { status: 400 });
  }

  const owns = await teacherOwnsSubject(session.user.id, subjectId);
  if (!owns) {
    return NextResponse.json(
      { error: "You are not assigned to this subject" },
      { status: 403 }
    );
  }

  try {
    const allQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.subjectId, subjectId));

    return NextResponse.json(allQuestions);
  } catch (err) {
    console.error("Failed to fetch questions:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
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

  const parsed = questionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // THE KEY SECURITY CHECK: is this teacher actually allowed to touch this subject?
  const owns = await teacherOwnsSubject(session.user.id, data.subjectId);
  if (!owns) {
    return NextResponse.json(
      { error: "You are not assigned to this subject" },
      { status: 403 }
    );
  }

  // Extra validation: MCQ/true-false must have a correct answer
  if (
    (data.type === "mcq" || data.type === "true_false") &&
    !data.correctAnswer
  ) {
    return NextResponse.json(
      { error: "Correct answer is required for this question type" },
      { status: 400 }
    );
  }

  try {
    const [newQuestion] = await db
      .insert(questions)
      .values({
        createdBy: session.user.id,
        subjectId: data.subjectId,
        type: data.type,
        questionText: data.questionText,
        options: data.options || null,
        correctAnswer: data.correctAnswer || null,
        topic: data.topic || null,
        difficulty: data.difficulty || null,
      })
      .returning();

    return NextResponse.json(newQuestion);
  } catch (err) {
    console.error("Failed to create question:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
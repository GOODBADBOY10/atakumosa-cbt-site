import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { questions, examQuestions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  questionText: z.string().trim().min(3).optional(),
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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    // Only allow editing a question this teacher actually created
    const [updated] = await db
      .update(questions)
      .set(parsed.data)
      .where(and(eq(questions.id, id), eq(questions.createdBy, session.user.id)))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Question not found or you don't have permission to edit it" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Failed to update question:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  try {
    // Check if this question is already used in an exam
    const usedInExam = await db
      .select()
      .from(examQuestions)
      .where(eq(examQuestions.questionId, id))
      .limit(1);

    if (usedInExam.length > 0) {
      return NextResponse.json(
        {
          error:
            "This question is already used in an exam and cannot be deleted. Remove it from the exam first, or it will affect students who may have already answered it.",
        },
        { status: 409 }
      );
    }

    const [deleted] = await db
      .delete(questions)
      .where(and(eq(questions.id, id), eq(questions.createdBy, session.user.id)))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Question not found or you don't have permission to delete it" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Question deleted successfully" });
  } catch (err) {
    console.error("Failed to delete question:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
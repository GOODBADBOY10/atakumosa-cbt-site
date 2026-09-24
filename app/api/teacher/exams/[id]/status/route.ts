import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { exams } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { logAction } from "@/lib/audit";

const statusSchema = z.object({
  status: z.enum(["draft", "published", "closed"]),
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

  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    // Only allow updating an exam this teacher actually created
    const [updated] = await db
      .update(exams)
      .set({ status: parsed.data.status })
      .where(and(eq(exams.id, id), eq(exams.createdBy, session.user.id)))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Exam not found or you don't have permission to edit it" },
        { status: 404 }
      );
    }

    await logAction(session.user.id, "teacher", `exam_status_${parsed.data.status}`, {
      examId: id,
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Failed to update exam status:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
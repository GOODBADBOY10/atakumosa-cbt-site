import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { exams } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { logAction } from "@/lib/audit";

const releaseSchema = z.object({
  resultsReleased: z.boolean(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = releaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const [updated] = await db
      .update(exams)
      .set({ resultsReleased: parsed.data.resultsReleased })
      .where(eq(exams.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    await logAction(
      session.user.id,
      "admin",
      parsed.data.resultsReleased ? "released_results" : "hid_results",
      { examId: id }
    );

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Failed to update release status:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
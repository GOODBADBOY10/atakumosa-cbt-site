import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { questions, teacherAssignments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import * as XLSX from "xlsx";
import { z } from "zod";

const rowSchema = z.object({
  Question: z.string().trim().min(3),
  Type: z.enum(["mcq", "true_false", "fill_blank", "essay"]),
  OptionA: z.string().optional(),
  OptionB: z.string().optional(),
  OptionC: z.string().optional(),
  OptionD: z.string().optional(),
  CorrectAnswer: z.string().optional(),
  Topic: z.string().optional(),
  Difficulty: z.string().optional(),
});

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

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const subjectId = formData.get("subjectId") as string | null;

  if (!file || !subjectId) {
    return NextResponse.json(
      { error: "File and subjectId are required" },
      { status: 400 }
    );
  }

  const owns = await teacherOwnsSubject(session.user.id, subjectId);
  if (!owns) {
    return NextResponse.json(
      { error: "You are not assigned to this subject" },
      { status: 403 }
    );
  }

  let rows: Record<string, unknown>[];
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    rows = XLSX.utils.sheet_to_json(sheet);
  } catch (err) {
    console.error("Failed to parse file:", err);
    return NextResponse.json(
      { error: "Could not read the uploaded file. Make sure it's a valid Excel/CSV file." },
      { status: 400 }
    );
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "The file has no data rows" }, { status: 400 });
  }

  // Validate every row, collect errors with row numbers, don't insert anything until ALL rows pass
  const validRows: z.infer<typeof rowSchema>[] = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const parsed = rowSchema.safeParse(row);
    if (!parsed.success) {
      errors.push(`Row ${index + 2}: ${parsed.error.issues[0].message}`); // +2 accounts for header row + 0-index
      return;
    }

    const data = parsed.data;

    if ((data.Type === "mcq" || data.Type === "true_false") && !data.CorrectAnswer) {
      errors.push(`Row ${index + 2}: Correct answer is required for ${data.Type} questions`);
      return;
    }

    if (data.Type === "mcq" && (!data.OptionA || !data.OptionB)) {
      errors.push(`Row ${index + 2}: MCQ questions need at least Option A and B`);
      return;
    }

    validRows.push(data);
  });

  if (errors.length > 0) {
    return NextResponse.json(
      {
        error: "Some rows had errors. Fix them and re-upload.",
        details: errors,
        validCount: validRows.length,
        errorCount: errors.length,
      },
      { status: 400 }
    );
  }

  try {
    const toInsert = validRows.map((row) => ({
      createdBy: session.user.id,
      subjectId,
      type: row.Type,
      questionText: row.Question,
      options:
        row.Type === "mcq"
          ? {
              A: row.OptionA,
              B: row.OptionB,
              C: row.OptionC,
              D: row.OptionD,
            }
          : row.Type === "true_false"
          ? { A: "True", B: "False" }
          : null,
      correctAnswer: row.CorrectAnswer || null,
      topic: row.Topic || null,
      difficulty: row.Difficulty || null,
    }));

    const inserted = await db.insert(questions).values(toInsert).returning();

    return NextResponse.json({
      message: `${inserted.length} questions uploaded successfully`,
      count: inserted.length,
    });
  } catch (err) {
    console.error("Failed to bulk insert questions:", err);
    return NextResponse.json(
      { error: "Something went wrong while saving. Please try again." },
      { status: 500 }
    );
  }
}
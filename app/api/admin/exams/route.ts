import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { exams, subjects, classes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const allExams = await db
      .select({
        id: exams.id,
        title: exams.title,
        subjectName: subjects.name,
        className: classes.name,
        status: exams.status,
        resultsReleased: exams.resultsReleased,
      })
      .from(exams)
      .innerJoin(subjects, eq(exams.subjectId, subjects.id))
      .innerJoin(classes, eq(exams.classId, classes.id));

    return NextResponse.json(allExams);
  } catch (err) {
    console.error("Failed to fetch exams:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
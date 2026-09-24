import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { teacherAssignments, subjects, classes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const assignments = await db
      .select({
        id: teacherAssignments.id,
        subjectId: subjects.id,
        subjectName: subjects.name,
        classId: classes.id,
        className: classes.name,
      })
      .from(teacherAssignments)
      .innerJoin(subjects, eq(teacherAssignments.subjectId, subjects.id))
      .innerJoin(classes, eq(teacherAssignments.classId, classes.id))
      .where(eq(teacherAssignments.teacherId, session.user.id));

    return NextResponse.json(assignments);
  } catch (err) {
    console.error("Failed to fetch teacher assignments:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
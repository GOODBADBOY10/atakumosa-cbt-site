import { auth } from "@/auth";
import { db } from "@/lib/db";
import { classes, subjects, teacherAssignments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "teacher" && session?.user?.role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    if (session.user.role === "super_admin") {
      // Super admin can work with every subject in every class
      const allSubjects = await db.select().from(subjects);
      const allClasses = await db.select().from(classes);
      return NextResponse.json(
        allSubjects.flatMap((s) =>
          allClasses.map((c) => ({
            id: `${s.id}:${c.id}`,
            subjectId: s.id,
            subjectName: s.name,
            classId: c.id,
            className: c.name,
          }))
        )
      );
    }
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
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users, teacherAssignments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { logAction } from "@/lib/audit";

const assignmentSchema = z.object({
  subjectId: z.string().uuid(),
  classId: z.string().uuid(),
});

const teacherSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  fullName: z.string().trim().min(2, "Full name is required").max(100),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
  assignments: z.array(assignmentSchema).optional().default([]),
});

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const teachers = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.role, "teacher"));

    return NextResponse.json(teachers);
  } catch (err) {
    console.error("Failed to fetch teachers:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = teacherSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { email, fullName, password, assignments } = parsed.data;

  try {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [newTeacher] = await db
      .insert(users)
      .values({ email, fullName, passwordHash, role: "teacher" })
      .returning({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
      });

    if (assignments.length > 0) {
      // Deduplicate in case the client sent repeats
      const unique = Array.from(
        new Map(
          assignments.map((a) => [`${a.subjectId}-${a.classId}`, a])
        ).values()
      );

      await db.insert(teacherAssignments).values(
        unique.map((a) => ({
          teacherId: newTeacher.id,
          subjectId: a.subjectId,
          classId: a.classId,
        }))
      );
    }

    await logAction(session.user.id, "admin", "created_teacher", {
      teacherId: newTeacher.id,
      email: newTeacher.email,
    });

    return NextResponse.json(newTeacher);
  } catch (err) {
    console.error("Failed to create teacher:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
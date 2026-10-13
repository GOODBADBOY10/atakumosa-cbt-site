import { auth } from "@/auth";
import { logAction } from "@/lib/audit";
import { db } from "@/lib/db";
import { studentClasses, users } from "@/lib/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const studentSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  regNumber: z.string().trim().min(2).max(50),
  password: z.string().trim().min(2, "Password must be at least 2 characters"),
  // password: z.string().min(6, "Password must be at least 6 characters"),
  classId: z.string().uuid(),
});

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "admin" && session?.user?.role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const students = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        regNumber: users.regNumber,
      })
      .from(users)
      .where(eq(users.role, "student"));

    return NextResponse.json(students);
  } catch (err) {
    console.error("Failed to fetch students:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "admin" && session?.user?.role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = studentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { fullName, regNumber, password, classId } = parsed.data;

  try {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.regNumber, regNumber));

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "A student with this registration number already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create the student AND their class link together. If either fails,
    // neither is saved, so we can never get a student with no class again.
    const newStudent = await db.transaction(async (tx) => {
      const [student] = await tx
        .insert(users)
        .values({
          email: `${regNumber}@student.local`,
          fullName,
          regNumber,
          passwordHash,
          role: "student",
          mustChangePassword: false,
        })
        .returning({ id: users.id, fullName: users.fullName, regNumber: users.regNumber });

      await tx.insert(studentClasses).values({
        studentId: student.id,
        classId,
      });

      return student;
    });

    await logAction(session.user.id, "admin", "created_student", {
      studentId: newStudent.id,
      regNumber: newStudent.regNumber,
      classId,
    });

    return NextResponse.json(newStudent);
  } catch (err) {
    console.error("Failed to create student:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
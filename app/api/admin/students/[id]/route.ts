import { auth } from "@/auth";
import { logAction } from "@/lib/audit";
import { db } from "@/lib/db";
import { classes, studentClasses, users } from "@/lib/db/schema";
import bcrypt from "bcryptjs";
import { and, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  fullName: z.string().trim().min(2).max(100).optional(),
  regNumber: z.string().trim().min(2).max(50).optional(),
  classId: z.string().uuid().optional(),
  password: z.string().trim().min(2, "Password must be at least 2 characters").optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== "admin" && session?.user?.role !== "super_admin") {
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

  const { fullName, regNumber, classId, password } = parsed.data;

  if (!fullName && !regNumber && !classId && !password) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const [student] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, id), eq(users.role, "student")));

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (regNumber && regNumber !== student.regNumber) {
      const clash = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.regNumber, regNumber), ne(users.id, id)));
      if (clash.length > 0) {
        return NextResponse.json(
          { error: "Another student already has this registration number" },
          { status: 409 }
        );
      }
    }

    if (classId) {
      const [cls] = await db.select().from(classes).where(eq(classes.id, classId));
      if (!cls) {
        return NextResponse.json({ error: "Class not found" }, { status: 404 });
      }
    }

    const updates: Partial<typeof users.$inferInsert> = {};
    if (fullName) updates.fullName = fullName;
    if (regNumber) {
      updates.regNumber = regNumber;
      updates.email = `${regNumber}@student.local`;
    }
    if (password) {
      updates.passwordHash = await bcrypt.hash(password, 10);
      updates.mustChangePassword = false;
      updates.isLocked = false; // a password reset also unlocks the account
      updates.failedLoginAttempts = 0;
    }

    await db.transaction(async (tx) => {
      if (Object.keys(updates).length > 0) {
        await tx.update(users).set(updates).where(eq(users.id, id));
      }
      if (classId) {
        await tx.delete(studentClasses).where(eq(studentClasses.studentId, id));
        await tx.insert(studentClasses).values({ studentId: id, classId });
      }
    });

    await logAction(session.user.id, "admin", "edited_student", {
      studentId: id,
      changed: [
        fullName && "name",
        regNumber && "regNumber",
        classId && "class",
        password && "password",
      ].filter(Boolean),
    });

    return NextResponse.json({ message: "Student updated successfully" });
  } catch (err) {
    const e = err as { code?: string; cause?: { code?: string } };
    if ((e.code ?? e.cause?.code) === "23505") {
      return NextResponse.json(
        { error: "Another student already has this registration number" },
        { status: 409 }
      );
    }
    console.error("Failed to update student:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== "admin" && session?.user?.role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const [deleted] = await db
      .delete(users)
      .where(and(eq(users.id, id), eq(users.role, "student")))
      .returning({ id: users.id, fullName: users.fullName });

    if (!deleted) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    await logAction(session.user.id, "admin", "deleted_student", {
      deletedStudentId: deleted.id,
      deletedStudentName: deleted.fullName,
    });

    return NextResponse.json({ message: `${deleted.fullName} has been removed` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("foreign key") || message.includes("violates")) {
      return NextResponse.json(
        {
          error:
            "This student has already taken an exam. They cannot be deleted to protect their grade records.",
        },
        { status: 409 }
      );
    }
    console.error("Failed to delete student:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// import { NextResponse } from "next/server";
// import { auth } from "@/auth";
// import { db } from "@/lib/db";
// import { users } from "@/lib/db/schema";
// import { eq } from "drizzle-orm";
// import { logAction } from "@/lib/audit";

// export async function DELETE(
//     req: Request,
//     { params }: { params: Promise<{ id: string }> }
// ) {
//     const session = await auth();
//     if (session?.user?.role !== "admin" && session?.user?.role !== "super_admin") {
//         return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
//     }

//     const { id } = await params;

//     try {
//         const [deleted] = await db
//             .delete(users)
//             .where(eq(users.id, id))
//             .returning({ id: users.id, fullName: users.fullName });

//         if (!deleted) {
//             return NextResponse.json({ error: "Student not found" }, { status: 404 });
//         }

//         await logAction(session.user.id, "admin", "deleted_student", {
//             deletedStudentId: deleted.id,
//             deletedStudentName: deleted.fullName,
//         });

//         return NextResponse.json({ message: `${deleted.fullName} has been removed` });
//     } catch (err: unknown) {
//         const message = err instanceof Error ? err.message : "";
//         if (message.includes("foreign key") || message.includes("violates")) {
//             return NextResponse.json(
//                 {
//                     error:
//                         "This student has already taken an exam. They cannot be deleted to protect their grade records.",
//                 },
//                 { status: 409 }
//             );
//         }
//         console.error("Failed to delete student:", err);
//         return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
//     }
// }
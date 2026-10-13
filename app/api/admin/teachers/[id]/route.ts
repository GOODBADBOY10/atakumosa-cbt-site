import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users, teacherAssignments } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { logAction } from "@/lib/audit";

const updateSchema = z.object({
    fullName: z.string().trim().min(2).max(100).optional(),
    email: z.string().trim().toLowerCase().email("Enter a valid email").optional(),
    password: z.string().min(8, "Password must be at least 8 characters").optional(),
    assignments: z
        .array(z.object({ subjectId: z.string().uuid(), classId: z.string().uuid() }))
        .optional(),
});

function dbCode(err: unknown): string | undefined {
    const e = err as { code?: string; cause?: { code?: string } };
    return e.code ?? e.cause?.code;
}

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

    const { fullName, email, password, assignments } = parsed.data;

    if (!fullName && !email && !password && assignments === undefined) {
        return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    try {
        const [teacher] = await db
            .select()
            .from(users)
            .where(and(eq(users.id, id), eq(users.role, "teacher")));

        if (!teacher) {
            return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
        }

        if (email && email !== teacher.email) {
            const clash = await db
                .select({ id: users.id })
                .from(users)
                .where(and(eq(users.email, email), ne(users.id, id)));
            if (clash.length > 0) {
                return NextResponse.json({ error: "Another user already has this email" }, { status: 409 });
            }
        }

        const updates: Partial<typeof users.$inferInsert> = {};
        if (fullName) updates.fullName = fullName;
        if (email) updates.email = email;
        if (password) {
            updates.passwordHash = await bcrypt.hash(password, 10);
            updates.mustChangePassword = true; // teacher chooses their own password on next login
            updates.isLocked = false;
            updates.failedLoginAttempts = 0;
        }

        await db.transaction(async (tx) => {
            if (Object.keys(updates).length > 0) {
                await tx.update(users).set(updates).where(eq(users.id, id));
            }
            if (assignments !== undefined) {
                await tx.delete(teacherAssignments).where(eq(teacherAssignments.teacherId, id));
                const unique = Array.from(
                    new Map(assignments.map((a) => [`${a.subjectId}:${a.classId}`, a])).values()
                );
                if (unique.length > 0) {
                    await tx.insert(teacherAssignments).values(
                        unique.map((a) => ({ teacherId: id, subjectId: a.subjectId, classId: a.classId }))
                    );
                }
            }
        });

        await logAction(session.user.id, session.user.role, "edited_teacher", {
            teacherId: id,
            changed: [
                fullName && "name",
                email && "email",
                password && "password",
                assignments !== undefined && "assignments",
            ].filter(Boolean),
        });

        return NextResponse.json({ message: "Teacher updated successfully" });
    } catch (err) {
        const code = dbCode(err);
        if (code === "23505") {
            return NextResponse.json({ error: "Another user already has this email" }, { status: 409 });
        }
        if (code === "23503") {
            return NextResponse.json({ error: "One of the selected subjects or classes no longer exists" }, { status: 400 });
        }
        console.error("Failed to update teacher:", err);
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
            .where(and(eq(users.id, id), eq(users.role, "teacher")))
            .returning({ id: users.id, fullName: users.fullName });

        if (!deleted) {
            return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
        }

        await logAction(session.user.id, session.user.role, "deleted_teacher", {
            deletedTeacherId: deleted.id,
            deletedTeacherName: deleted.fullName,
        });

        return NextResponse.json({ message: `${deleted.fullName} has been removed` });
    } catch (err) {
        if (dbCode(err) === "23503") {
            return NextResponse.json(
                {
                    error:
                        "This teacher has already created questions or exams. They cannot be deleted to protect that data.",
                },
                { status: 409 }
            );
        }
        console.error("Failed to delete teacher:", err);
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
//     if (session?.user?.role !== "admin") {
//         return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
//     }

//     const { id } = await params;

//     try {
//         const [deleted] = await db
//             .delete(users)
//             .where(eq(users.id, id))
//             .returning({ id: users.id, fullName: users.fullName });

//         if (!deleted) {
//             return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
//         }

//         await logAction(session.user.id, "admin", "deleted_teacher", {
//             deletedTeacherId: deleted.id,
//             deletedTeacherName: deleted.fullName,
//         });

//         return NextResponse.json({ message: `${deleted.fullName} has been removed` });
//     } catch (err: unknown) {
//         // Foreign key violation = this teacher has created questions/exams already in use
//         const message = err instanceof Error ? err.message : "";
//         if (message.includes("foreign key") || message.includes("violates")) {
//             return NextResponse.json(
//                 {
//                     error:
//                         "This teacher has already created questions or exams that students may have used. They cannot be deleted to protect that data.",
//                 },
//                 { status: 409 }
//             );
//         }
//         console.error("Failed to delete teacher:", err);
//         return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
//     }
// }
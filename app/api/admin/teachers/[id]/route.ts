import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logAction } from "@/lib/audit";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (session?.user?.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    try {
        const [deleted] = await db
            .delete(users)
            .where(eq(users.id, id))
            .returning({ id: users.id, fullName: users.fullName });

        if (!deleted) {
            return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
        }

        await logAction(session.user.id, "admin", "deleted_teacher", {
            deletedTeacherId: deleted.id,
            deletedTeacherName: deleted.fullName,
        });

        return NextResponse.json({ message: `${deleted.fullName} has been removed` });
    } catch (err: unknown) {
        // Foreign key violation = this teacher has created questions/exams already in use
        const message = err instanceof Error ? err.message : "";
        if (message.includes("foreign key") || message.includes("violates")) {
            return NextResponse.json(
                {
                    error:
                        "This teacher has already created questions or exams that students may have used. They cannot be deleted to protect that data.",
                },
                { status: 409 }
            );
        }
        console.error("Failed to delete teacher:", err);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
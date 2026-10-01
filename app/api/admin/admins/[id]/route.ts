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

    if (id === session.user.id) {
        return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
    }

    try {
        const allAdmins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
        if (allAdmins.length <= 1) {
            return NextResponse.json(
                { error: "Cannot delete the only remaining admin account" },
                { status: 400 }
            );
        }

        const [deleted] = await db
            .delete(users)
            .where(eq(users.id, id))
            .returning({ id: users.id, fullName: users.fullName });

        if (!deleted) {
            return NextResponse.json({ error: "Admin not found" }, { status: 404 });
        }

        await logAction(session.user.id, "admin", "deleted_admin", {
            deletedAdminId: deleted.id,
            deletedAdminName: deleted.fullName,
        });

        return NextResponse.json({ message: `${deleted.fullName} has been removed` });
    } catch (err) {
        console.error("Failed to delete admin:", err);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
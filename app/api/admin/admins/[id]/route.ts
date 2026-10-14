import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { z } from "zod";
import { logAction } from "@/lib/audit";


const updateSchema = z.object({
    fullName: z.string().trim().min(2).max(100).optional(),
    email: z.string().trim().toLowerCase().email("Enter a valid email").optional(),
});

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (session?.user?.role !== "super_admin") {
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

    const { fullName, email } = parsed.data;
    if (!fullName && !email) {
        return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    try {
        const [target] = await db
            .select()
            .from(users)
            .where(and(eq(users.id, id), eq(users.role, "admin")));

        if (!target) {
            return NextResponse.json({ error: "Admin not found" }, { status: 404 });
        }

        if (email && email !== target.email) {
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

        await db.update(users).set(updates).where(eq(users.id, id));

        await logAction(session.user.id, session.user.role, "edited_admin", {
            adminId: id,
            changed: [fullName && "name", email && "email"].filter(Boolean),
        });

        return NextResponse.json({ message: "Admin updated successfully" });
    } catch (err) {
        console.error("Failed to update admin:", err);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (session?.user?.role !== "super_admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    if (id === session.user.id) {
        return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
    }

    try {
        const [deleted] = await db
            .delete(users)
            .where(and(eq(users.id, id), eq(users.role, "admin")))
            .returning({ id: users.id, fullName: users.fullName });

        if (!deleted) {
            return NextResponse.json({ error: "Admin not found" }, { status: 404 });
        }

        await logAction(session.user.id, session.user.role, "deleted_admin", {
            deletedAdminId: deleted.id,
            deletedAdminName: deleted.fullName,
        });

        return NextResponse.json({ message: `${deleted.fullName} has been removed` });
    } catch (err) {
        console.error("Failed to delete admin:", err);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logAction } from "@/lib/audit";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (session?.user?.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    try {
        const [updated] = await db
            .update(users)
            .set({ isLocked: false, failedLoginAttempts: 0 })
            .where(eq(users.id, id))
            .returning({ id: users.id, fullName: users.fullName });

        if (!updated) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        await logAction(session.user.id, "admin", "unlocked_account", {
            unlockedUserId: id,
            unlockedUserName: updated.fullName,
        });

        return NextResponse.json({ message: `${updated.fullName}'s account has been unlocked` });
    } catch (err) {
        console.error("Failed to unlock account:", err);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
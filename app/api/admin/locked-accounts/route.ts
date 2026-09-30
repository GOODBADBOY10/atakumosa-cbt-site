import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logAction } from "@/lib/audit";

export async function GET() {
    const session = await auth();
    if (session?.user?.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const locked = await db
            .select({
                id: users.id,
                fullName: users.fullName,
                email: users.email,
                regNumber: users.regNumber,
                role: users.role,
                failedLoginAttempts: users.failedLoginAttempts,
            })
            .from(users)
            .where(eq(users.isLocked, true));

        return NextResponse.json(locked);
    } catch (err) {
        console.error("Failed to fetch locked accounts:", err);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
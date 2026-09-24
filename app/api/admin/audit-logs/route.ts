import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { auditLogs, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
    const session = await auth();
    if (session?.user?.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const logs = await db
            .select({
                id: auditLogs.id,
                userName: users.fullName,
                userRole: auditLogs.userRole,
                action: auditLogs.action,
                details: auditLogs.details,
                createdAt: auditLogs.createdAt,
            })
            .from(auditLogs)
            .leftJoin(users, eq(auditLogs.userId, users.id))
            .orderBy(desc(auditLogs.createdAt))
            .limit(100);

        return NextResponse.json(logs);
    } catch (err) {
        console.error("Failed to fetch audit logs:", err);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
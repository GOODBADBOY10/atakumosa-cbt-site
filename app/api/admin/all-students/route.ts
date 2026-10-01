import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users, studentClasses, classes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
    const session = await auth();
    if (session?.user?.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const results = await db
            .select({
                id: users.id,
                fullName: users.fullName,
                regNumber: users.regNumber,
                className: classes.name,
                classId: classes.id,
            })
            .from(users)
            .innerJoin(studentClasses, eq(studentClasses.studentId, users.id))
            .innerJoin(classes, eq(studentClasses.classId, classes.id))
            .where(eq(users.role, "student"));

        results.sort((a, b) => a.fullName.localeCompare(b.fullName));

        return NextResponse.json(results);
    } catch (err) {
        console.error("Failed to fetch students:", err);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
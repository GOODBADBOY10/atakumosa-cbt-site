import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users, studentClasses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
    const session = await auth();
    if (session?.user?.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");

    if (!classId) {
        return NextResponse.json({ error: "classId is required" }, { status: 400 });
    }

    try {
        const results = await db
            .select({
                id: users.id,
                fullName: users.fullName,
                regNumber: users.regNumber,
            })
            .from(studentClasses)
            .innerJoin(users, eq(studentClasses.studentId, users.id))
            .where(eq(studentClasses.classId, classId));

        results.sort((a, b) => a.fullName.localeCompare(b.fullName));

        return NextResponse.json(results);
    } catch (err) {
        console.error("Failed to fetch class students:", err);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { exams } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: Request) {
    const session = await auth();
    if (session?.user?.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");
    const classId = searchParams.get("classId");

    if (!subjectId || !classId) {
        return NextResponse.json({ error: "subjectId and classId are required" }, { status: 400 });
    }

    try {
        const results = await db
            .select({
                id: exams.id,
                title: exams.title,
                startsAt: exams.startsAt,
                status: exams.status,
            })
            .from(exams)
            .where(and(eq(exams.subjectId, subjectId), eq(exams.classId, classId)));

        return NextResponse.json(results);
    } catch (err) {
        console.error("Failed to fetch exams:", err);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
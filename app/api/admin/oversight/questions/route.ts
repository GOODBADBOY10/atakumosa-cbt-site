import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { questions, users, subjects } from "@/lib/db/schema";
import { eq, and, desc, type SQL } from "drizzle-orm";
import { z } from "zod";

const filterSchema = z.object({
    teacherId: z.string().uuid().optional(),
    subjectId: z.string().uuid().optional(),
});

export async function GET(req: Request) {
    const session = await auth();
    if (session?.user?.role !== "super_admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const filters = filterSchema.safeParse({
        teacherId: searchParams.get("teacherId") || undefined,
        subjectId: searchParams.get("subjectId") || undefined,
    });
    if (!filters.success) {
        return NextResponse.json({ error: "Invalid filter" }, { status: 400 });
    }

    const conditions: SQL[] = [];
    if (filters.data.teacherId) conditions.push(eq(questions.createdBy, filters.data.teacherId));
    if (filters.data.subjectId) conditions.push(eq(questions.subjectId, filters.data.subjectId));

    try {
        const rows = await db
            .select({
                id: questions.id,
                questionText: questions.questionText,
                type: questions.type,
                options: questions.options,
                correctAnswer: questions.correctAnswer,
                topic: questions.topic,
                difficulty: questions.difficulty,
                createdAt: questions.createdAt,
                teacherName: users.fullName,
                subjectName: subjects.name,
            })
            .from(questions)
            .innerJoin(users, eq(questions.createdBy, users.id))
            .innerJoin(subjects, eq(questions.subjectId, subjects.id))
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(questions.createdAt))
            .limit(500);

        return NextResponse.json(rows);
    } catch (err) {
        console.error("Failed to load questions overview:", err);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
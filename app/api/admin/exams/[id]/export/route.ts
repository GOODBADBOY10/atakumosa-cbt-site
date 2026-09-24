import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { exams, examAttempts, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (session?.user?.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id: examId } = await params;

    try {
        const [exam] = await db.select().from(exams).where(eq(exams.id, examId));
        if (!exam) {
            return NextResponse.json({ error: "Exam not found" }, { status: 404 });
        }

        const attempts = await db
            .select({
                studentName: users.fullName,
                regNumber: users.regNumber,
                score: examAttempts.score,
                totalPossible: examAttempts.totalPossible,
                submittedAt: examAttempts.submittedAt,
                tabSwitchCount: examAttempts.tabSwitchCount,
                gradingComplete: examAttempts.gradingComplete,
            })
            .from(examAttempts)
            .innerJoin(users, eq(examAttempts.studentId, users.id))
            .where(eq(examAttempts.examId, examId));

        // Build CSV manually - no extra library needed for this
        const headers = [
            "Student Name",
            "Reg Number",
            "Score",
            "Total",
            "Percentage",
            "Submitted At",
            "Tab Switches",
            "Grading Complete",
        ];

        const rows = attempts.map((a) => {
            const percentage =
                a.score !== null && a.totalPossible
                    ? ((a.score / a.totalPossible) * 100).toFixed(1) + "%"
                    : "N/A";

            return [
                a.studentName,
                a.regNumber || "",
                a.score ?? "N/A",
                a.totalPossible ?? "N/A",
                percentage,
                a.submittedAt ? new Date(a.submittedAt).toLocaleString() : "Not submitted",
                a.tabSwitchCount,
                a.gradingComplete ? "Yes" : "No",
            ];
        });

        const escapeCsv = (val: unknown) => {
            const str = String(val);
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const csvContent = [
            headers.map(escapeCsv).join(","),
            ...rows.map((row) => row.map(escapeCsv).join(",")),
        ].join("\n");

        const filename = `${exam.title.replace(/[^a-z0-9]/gi, "_")}_results.csv`;

        return new NextResponse(csvContent, {
            status: 200,
            headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (err) {
        console.error("Failed to export CSV:", err);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
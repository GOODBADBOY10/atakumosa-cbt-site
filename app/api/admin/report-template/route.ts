import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
    users,
    studentClasses,
    exams,
    examAttempts,
    subjects,
    classes,
} from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import * as XLSX from "xlsx";

export async function GET(req: Request) {
    const session = await auth();
    if (session?.user?.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");
    const classId = searchParams.get("classId");
    const examId = searchParams.get("examId"); // optional - "none" or omitted means blank exam column

    if (!subjectId || !classId) {
        return NextResponse.json({ error: "subjectId and classId are required" }, { status: 400 });
    }

    try {
        const [subject] = await db.select().from(subjects).where(eq(subjects.id, subjectId));
        const [classInfo] = await db.select().from(classes).where(eq(classes.id, classId));

        if (!subject || !classInfo) {
            return NextResponse.json({ error: "Subject or class not found" }, { status: 404 });
        }

        // All students enrolled in this class
        const studentRows = await db
            .select({
                id: users.id,
                fullName: users.fullName,
                regNumber: users.regNumber,
            })
            .from(studentClasses)
            .innerJoin(users, eq(studentClasses.studentId, users.id))
            .where(eq(studentClasses.classId, classId));

        studentRows.sort((a, b) => a.fullName.localeCompare(b.fullName));

        // Pull exam scores if a specific exam was selected
        let scoreMap = new Map<string, { score: number | null; totalPossible: number | null }>();
        let examTitle = "N/A";

        if (examId && examId !== "none") {
            const [examInfo] = await db.select().from(exams).where(eq(exams.id, examId));
            if (examInfo) examTitle = examInfo.title;

            const studentIds = studentRows.map((s) => s.id);
            const attempts = await db
                .select({
                    studentId: examAttempts.studentId,
                    score: examAttempts.score,
                    totalPossible: examAttempts.totalPossible,
                })
                .from(examAttempts)
                .where(
                    and(
                        eq(examAttempts.examId, examId),
                        inArray(examAttempts.studentId, studentIds.length > 0 ? studentIds : ["none"])
                    )
                );

            scoreMap = new Map(
                attempts.map((a) => [a.studentId, { score: a.score, totalPossible: a.totalPossible }])
            );
        }

        // Build the worksheet data
        const headerInfo = [
            [`${classInfo.name} — ${subject.name} — Result Sheet`],
            [`Exam used for scores: ${examTitle}`],
            [`Generated: ${new Date().toLocaleDateString()}`],
            [],
        ];

        const headerRow = ["S/N", "Student Name", "Reg. Number", "CA1", "CA2", "Exam Score", "Total"];

        const dataRows = studentRows.map((student, index) => {
            const attempt = scoreMap.get(student.id);
            const examScore = attempt?.score ?? "";
            return [
                index + 1,
                student.fullName,
                student.regNumber || "",
                "", // CA1 - blank for teacher to fill
                "", // CA2 - blank for teacher to fill
                examScore, // pre-filled if available
                "", // Total - will be a formula, filled below
            ];
        });

        const sheetData = [...headerInfo, headerRow, ...dataRows];

        const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

        // Add SUM formula for the Total column (D=CA1, E=CA2, F=Exam) for each student row
        const dataStartRow = headerInfo.length + 1; // 0-indexed count -> next row is header, then data starts after
        dataRows.forEach((_, i) => {
            const rowNum = dataStartRow + 1 + i + 1; // +1 to convert to 1-indexed Excel row, +1 to skip header row
            const cellRef = `G${rowNum}`;
            worksheet[cellRef] = { f: `SUM(D${rowNum}:F${rowNum})`, t: "n" };
        });

        worksheet["!cols"] = [
            { wch: 5 },  // S/N
            { wch: 28 }, // Name
            { wch: 15 }, // Reg No
            { wch: 8 },  // CA1
            { wch: 8 },  // CA2
            { wch: 12 }, // Exam Score
            { wch: 10 }, // Total
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Result Sheet");

        const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

        const filename = `${classInfo.name}_${subject.name}_result_sheet.xlsx`.replace(/\s+/g, "_");

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (err) {
        console.error("Failed to generate report template:", err);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
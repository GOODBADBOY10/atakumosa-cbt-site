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
    const classId = searchParams.get("classId");
    const studentId = searchParams.get("studentId"); // optional - if omitted, generate for whole class

    if (!classId) {
        return NextResponse.json({ error: "classId is required" }, { status: 400 });
    }

    try {
        const [classInfo] = await db.select().from(classes).where(eq(classes.id, classId));
        if (!classInfo) {
            return NextResponse.json({ error: "Class not found" }, { status: 404 });
        }

        // Students to generate for: either one specific student, or everyone in the class
        let studentRows = await db
            .select({
                id: users.id,
                fullName: users.fullName,
                regNumber: users.regNumber,
            })
            .from(studentClasses)
            .innerJoin(users, eq(studentClasses.studentId, users.id))
            .where(eq(studentClasses.classId, classId));

        if (studentId) {
            studentRows = studentRows.filter((s) => s.id === studentId);
            if (studentRows.length === 0) {
                return NextResponse.json(
                    { error: "Student not found in this class" },
                    { status: 404 }
                );
            }
        }

        studentRows.sort((a, b) => a.fullName.localeCompare(b.fullName));

        // Find every exam ever created for this class, then pick the MOST RECENT
        // published exam per subject - that becomes "the" exam score for that subject.
        const classExams = await db
            .select({
                id: exams.id,
                subjectId: exams.subjectId,
                startsAt: exams.startsAt,
                status: exams.status,
            })
            .from(exams)
            .where(and(eq(exams.classId, classId), eq(exams.status, "published")));

        const latestExamPerSubject = new Map<string, { examId: string; startsAt: Date }>();
        for (const exam of classExams) {
            const existing = latestExamPerSubject.get(exam.subjectId);
            const examDate = new Date(exam.startsAt);
            if (!existing || examDate > existing.startsAt) {
                latestExamPerSubject.set(exam.subjectId, { examId: exam.id, startsAt: examDate });
            }
        }

        const subjectIds = Array.from(latestExamPerSubject.keys());

        if (subjectIds.length === 0) {
            return NextResponse.json(
                { error: "No published exams found for this class yet" },
                { status: 404 }
            );
        }

        const subjectInfos = await db
            .select()
            .from(subjects)
            .where(inArray(subjects.id, subjectIds));

        const subjectNameMap = new Map(subjectInfos.map((s) => [s.id, s.name]));

        // Pull all relevant attempts in one go: for the chosen exam per subject,
        // across all students we're generating sheets for.
        const relevantExamIds = Array.from(latestExamPerSubject.values()).map((v) => v.examId);
        const studentIds = studentRows.map((s) => s.id);

        const allAttempts = await db
            .select({
                studentId: examAttempts.studentId,
                examId: examAttempts.examId,
                score: examAttempts.score,
            })
            .from(examAttempts)
            .where(
                and(
                    inArray(examAttempts.examId, relevantExamIds),
                    inArray(examAttempts.studentId, studentIds.length > 0 ? studentIds : ["none"])
                )
            );

        // key: `${studentId}-${examId}` -> score
        const scoreLookup = new Map(
            allAttempts.map((a) => [`${a.studentId}-${a.examId}`, a.score])
        );

        // Build one worksheet per student
        const workbook = XLSX.utils.book_new();

        for (const student of studentRows) {
            const headerInfo = [
                [`${classInfo.name} — Report Sheet`],
                [`Student: ${student.fullName} (${student.regNumber || "No reg no."})`],
                [`Generated: ${new Date().toLocaleDateString()}`],
                [],
            ];

            const headerRow = ["S/N", "Subject", "CA1", "CA2", "Exam Score", "Total"];

            const dataRows = subjectIds.map((subjectId, index) => {
                const examInfo = latestExamPerSubject.get(subjectId)!;
                const score = scoreLookup.get(`${student.id}-${examInfo.examId}`);
                return [
                    index + 1,
                    subjectNameMap.get(subjectId) || "Unknown Subject",
                    "", // CA1 - blank
                    "", // CA2 - blank
                    score ?? "", // pre-filled if the student has a score for this subject's exam
                    "", // Total - formula below
                ];
            });

            const sheetData = [...headerInfo, headerRow, ...dataRows];
            const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

            const dataStartRow = headerInfo.length + 1;
            dataRows.forEach((_, i) => {
                const rowNum = dataStartRow + 1 + i + 1;
                const cellRef = `F${rowNum}`;
                worksheet[cellRef] = { f: `SUM(C${rowNum}:E${rowNum})`, t: "n" };
            });

            worksheet["!cols"] = [
                { wch: 5 },
                { wch: 22 },
                { wch: 8 },
                { wch: 8 },
                { wch: 12 },
                { wch: 10 },
            ];

            // Sheet names can't exceed 31 chars or contain certain characters
            const safeSheetName = student.fullName.slice(0, 28).replace(/[\\/*?:[\]]/g, "");
            XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName || "Student");
        }

        const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

        const filename = studentId
            ? `${studentRows[0].fullName.replace(/\s+/g, "_")}_report.xlsx`
            : `${classInfo.name.replace(/\s+/g, "_")}_all_students_report.xlsx`;

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (err) {
        console.error("Failed to generate student report:", err);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
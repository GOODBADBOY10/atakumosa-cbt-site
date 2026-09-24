import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { exams, examAttempts, examQuestions, questions, answers } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (session?.user?.role !== "teacher") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id: examId } = await params;

    try {
        const [exam] = await db
            .select()
            .from(exams)
            .where(and(eq(exams.id, examId), eq(exams.createdBy, session.user.id)));

        if (!exam) {
            return NextResponse.json(
                { error: "Exam not found or you don't have permission to view it" },
                { status: 404 }
            );
        }

        // Score distribution — only submitted attempts
        const attempts = await db
            .select({ score: examAttempts.score, totalPossible: examAttempts.totalPossible })
            .from(examAttempts)
            .where(and(eq(examAttempts.examId, examId)));

        const submittedScores = attempts
            .filter((a) => a.score !== null)
            .map((a) => a.score as number);

        const average =
            submittedScores.length > 0
                ? submittedScores.reduce((sum, s) => sum + s, 0) / submittedScores.length
                : 0;

        // Per-question correctness — scoped to THIS exam's attempts only.
        // (Questions can be reused across exams, so we must join through
        // examAttempts and filter by examId, not just by questionId.)
        const examQs = await db
            .select({ questionId: examQuestions.questionId, order: examQuestions.order })
            .from(examQuestions)
            .where(eq(examQuestions.examId, examId));

        const questionIds = examQs.map((q) => q.questionId);

        const questionInfos = await db
            .select({ id: questions.id, questionText: questions.questionText, type: questions.type })
            .from(questions)
            .where(inArray(questions.id, questionIds.length > 0 ? questionIds : ["00000000-0000-0000-0000-000000000000"]));

        const questionInfoMap = new Map(questionInfos.map((q) => [q.id, q]));

        // Pull all answers for this exam's attempts in one query, then group in memory
        const examAnswers = await db
            .select({ questionId: answers.questionId, isCorrect: answers.isCorrect })
            .from(answers)
            .innerJoin(examAttempts, eq(answers.attemptId, examAttempts.id))
            .where(eq(examAttempts.examId, examId));

        const perQuestionStats = examQs.map((eq_) => {
            const qInfo = questionInfoMap.get(eq_.questionId);
            const relevant = examAnswers.filter((a) => a.questionId === eq_.questionId);
            const answered = relevant.filter((a) => a.isCorrect !== null);
            const correct = answered.filter((a) => a.isCorrect).length;

            return {
                questionText: qInfo?.questionText || "Unknown",
                type: qInfo?.type,
                order: eq_.order,
                correctCount: correct,
                totalAnswered: answered.length,
                correctPercent: answered.length > 0 ? Math.round((correct / answered.length) * 100) : 0,
            };
        });

        perQuestionStats.sort((a, b) => a.order - b.order);

        return NextResponse.json({
            examTitle: exam.title,
            totalAttempts: attempts.length,
            submittedCount: submittedScores.length,
            average: Math.round(average * 10) / 10,
            highest: submittedScores.length > 0 ? Math.max(...submittedScores) : 0,
            lowest: submittedScores.length > 0 ? Math.min(...submittedScores) : 0,
            scoreDistribution: submittedScores,
            perQuestionStats,
        });
    } catch (err) {
        console.error("Failed to fetch analytics:", err);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
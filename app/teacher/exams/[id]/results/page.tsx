"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DashboardHeader } from "@/app/components/DashboardHeader";

type Attempt = {
    id: string;
    studentId: string;
    studentName: string;
    regNumber: string | null;
    startedAt: string;
    submittedAt: string | null;
    score: number | null;
    totalPossible: number | null;
    gradingComplete: boolean;
    tabSwitchCount: number;
};

export default function ExamResultsPage() {
    const { id: examId } = useParams<{ id: string }>();
    const [examTitle, setExamTitle] = useState("");
    const [attempts, setAttempts] = useState<Attempt[]>([]);
    const [loading, setLoading] = useState(true);

    const loadAttempts = () => {
        fetch(`/api/teacher/exams/${examId}/attempts`)
            .then((res) => res.json())
            .then((data) => {
                if (data.exam) setExamTitle(data.exam.title);
                setAttempts(Array.isArray(data.attempts) ? data.attempts : []);
                setLoading(false);
            });
    };

    useEffect(() => {
        loadAttempts();
        // Poll every 10 seconds for "live" updates as students submit
        const interval = setInterval(loadAttempts, 10000);
        return () => clearInterval(interval);
    }, [examId]);

    const submittedCount = attempts.filter((a) => a.submittedAt).length;

    return (
        <div className="p-8 max-w-5xl mx-auto text-gray-900">
            <DashboardHeader title={`Results: ${examTitle}`} backHref="/teacher/exams" backLabel="← Exam Builder" />

            <a href={`/teacher/exams/${examId}/analytics`} className="text-blue-600 hover:underline text-sm font-medium mb-4 inline-block">
                View Analytics →
            </a>

            <p className="text-sm text-gray-500 mb-4">
                {submittedCount} / {attempts.length} students submitted • Updates automatically every 10s
            </p>

            {loading ? (
                <p>Loading...</p>
            ) : attempts.length === 0 ? (
                <p className="text-gray-500">No students have started this exam yet.</p>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-left p-3">Student</th>
                                <th className="text-left p-3">Reg No.</th>
                                <th className="text-left p-3">Status</th>
                                <th className="text-left p-3">Score</th>
                                <th className="text-left p-3">Tab Switches</th>
                                <th className="text-left p-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {attempts.map((a) => (
                                <tr key={a.id}>
                                    <td className="p-3">{a.studentName}</td>
                                    <td className="p-3 text-gray-500">{a.regNumber || "—"}</td>
                                    <td className="p-3">
                                        {!a.submittedAt ? (
                                            <span className="text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full text-xs">
                                                In progress
                                            </span>
                                        ) : a.gradingComplete ? (
                                            <span className="text-green-700 bg-green-100 px-2 py-0.5 rounded-full text-xs">
                                                Graded
                                            </span>
                                        ) : (
                                            <span className="text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full text-xs">
                                                Needs grading
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-3">
                                        {a.score !== null ? `${a.score} / ${a.totalPossible}` : "—"}
                                    </td>
                                    <td className="p-3">
                                        {a.tabSwitchCount > 0 ? (
                                            <span className="text-red-600 font-medium">{a.tabSwitchCount}</span>
                                        ) : (
                                            "0"
                                        )}
                                    </td>
                                    <td className="p-3">
                                        {a.submittedAt && (
                                            <a
                                                href={`/teacher/attempts/${a.id}`}
                                                className="text-blue-600 hover:underline"
                                            >
                                                View / Grade
                                            </a>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
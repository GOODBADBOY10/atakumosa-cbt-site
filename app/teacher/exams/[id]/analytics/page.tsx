"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DashboardHeader } from "@/app/components/DashboardHeader";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type QuestionStat = {
    questionText: string;
    type: string;
    correctCount: number;
    totalAnswered: number;
    correctPercent: number;
};

type Analytics = {
    examTitle: string;
    totalAttempts: number;
    submittedCount: number;
    average: number;
    highest: number;
    lowest: number;
    perQuestionStats: QuestionStat[];
};

export default function ExamAnalyticsPage() {
    const { id: examId } = useParams<{ id: string }>();
    const [data, setData] = useState<Analytics | null>(null);

    useEffect(() => {
        fetch(`/api/teacher/exams/${examId}/analytics`)
            .then((res) => res.json())
            .then((d) => setData(d));
    }, [examId]);

    if (!data) return <p className="p-8">Loading...</p>;

    const chartData = data.perQuestionStats.map((q, idx) => ({
        name: `Q${idx + 1}`,
        correctPercent: q.correctPercent,
    }));

    return (
        <div className="p-8 max-w-4xl mx-auto text-gray-900">
            <DashboardHeader title={`Analytics: ${data.examTitle}`} />

            <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-4 rounded-lg shadow text-center">
                    <p className="text-2xl font-bold">{data.submittedCount}</p>
                    <p className="text-sm text-gray-500">Submitted</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow text-center">
                    <p className="text-2xl font-bold">{data.average}</p>
                    <p className="text-sm text-gray-500">Average Score</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow text-center">
                    <p className="text-2xl font-bold">{data.highest}</p>
                    <p className="text-sm text-gray-500">Highest</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow text-center">
                    <p className="text-2xl font-bold">{data.lowest}</p>
                    <p className="text-sm text-gray-500">Lowest</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow mb-8">
                <h2 className="text-lg font-semibold mb-4">Per-Question Difficulty</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Bar dataKey="correctPercent" fill="#2563eb" />
                    </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-gray-500 mt-2">
                    % of students who answered correctly. Lower bars = harder/more missed questions.
                </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-semibold mb-4">Question Breakdown</h2>
                <ul className="divide-y text-sm">
                    {data.perQuestionStats.map((q, idx) => (
                        <li key={idx} className="py-3">
                            <p className="font-medium">Q{idx + 1}: {q.questionText}</p>
                            <p className="text-gray-500">
                                {q.correctCount} / {q.totalAnswered} correct ({q.correctPercent}%)
                            </p>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
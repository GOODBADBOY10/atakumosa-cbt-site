"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/app/components/DashboardHeader";

type Tab = "activity" | "teachers" | "questions" | "exams";

type Activity = {
    id: string;
    userName: string | null;
    userRole: string | null;
    action: string;
    details: Record<string, unknown> | null;
    createdAt: string;
};
type TeacherStat = {
    id: string;
    fullName: string;
    email: string;
    assignments: string[];
    questionCount: number;
    examCount: number;
    lastActivity: string | null;
};
type QuestionRow = {
    id: string;
    questionText: string;
    type: string;
    options: Record<string, string> | null;
    correctAnswer: string | null;
    topic: string | null;
    difficulty: string | null;
    createdAt: string;
    teacherName: string;
    subjectName: string;
};
type ExamRow = {
    id: string;
    title: string;
    status: string;
    startsAt: string;
    endsAt: string;
    resultsReleased: boolean | null;
    subjectName: string;
    className: string;
    teacherName: string;
    questionCount: number;
    started: number;
    submitted: number;
};

async function getJson(url: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Could not load data");
    return res.json();
}

export default function OversightPage() {
    const [tab, setTab] = useState<Tab>("activity");
    const [activity, setActivity] = useState<Activity[]>([]);
    const [teachers, setTeachers] = useState<TeacherStat[]>([]);
    const [questions, setQuestions] = useState<QuestionRow[]>([]);
    const [exams, setExams] = useState<ExamRow[]>([]);
    const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
    const [teacherFilter, setTeacherFilter] = useState("");
    const [subjectFilter, setSubjectFilter] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Lists used by the question filters
    useEffect(() => {
        getJson("/api/admin/oversight/teachers").then(setTeachers).catch(() => { });
        getJson("/api/admin/subjects").then(setSubjects).catch(() => { });
    }, []);

    useEffect(() => {
        setLoading(true);
        setError("");

        let request: Promise<unknown>;
        if (tab === "activity") {
            request = getJson("/api/admin/audit-logs").then(setActivity);
        } else if (tab === "teachers") {
            request = getJson("/api/admin/oversight/teachers").then(setTeachers);
        } else if (tab === "questions") {
            const params = new URLSearchParams();
            if (teacherFilter) params.set("teacherId", teacherFilter);
            if (subjectFilter) params.set("subjectId", subjectFilter);
            request = getJson(`/api/admin/oversight/questions?${params}`).then(setQuestions);
        } else {
            request = getJson("/api/admin/oversight/exams").then(setExams);
        }

        request.catch((e) => setError(e.message)).finally(() => setLoading(false));
    }, [tab, teacherFilter, subjectFilter]);

    const fmt = (d: string | null) => (d ? new Date(d).toLocaleString() : "—");

    const tabs: { id: Tab; label: string }[] = [
        { id: "activity", label: "Activity" },
        { id: "teachers", label: "Teachers" },
        { id: "questions", label: "Questions" },
        { id: "exams", label: "Exams" },
    ];

    return (
        <div className="p-8 max-w-6xl mx-auto text-gray-900">
            <DashboardHeader title="Oversight" />

            <div className="flex gap-2 mb-6 flex-wrap">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                            }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
            {loading && <p className="text-sm text-gray-500 mb-4">Loading...</p>}

            {tab === "activity" && (
                <div className="bg-white rounded-lg shadow overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-left p-3">Time</th>
                                <th className="text-left p-3">User</th>
                                <th className="text-left p-3">Role</th>
                                <th className="text-left p-3">Action</th>
                                <th className="text-left p-3">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {activity.map((a) => (
                                <tr key={a.id}>
                                    <td className="p-3 text-gray-500 whitespace-nowrap">{fmt(a.createdAt)}</td>
                                    <td className="p-3">{a.userName ?? "Unknown"}</td>
                                    <td className="p-3 capitalize">{a.userRole?.replace("_", " ")}</td>
                                    <td className="p-3">{a.action.replace(/_/g, " ")}</td>
                                    <td className="p-3 text-xs text-gray-500 break-all max-w-xs">
                                        {a.details ? JSON.stringify(a.details) : ""}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {tab === "teachers" && (
                <div className="bg-white rounded-lg shadow overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-left p-3">Teacher</th>
                                <th className="text-left p-3">Assigned to</th>
                                <th className="text-left p-3">Questions</th>
                                <th className="text-left p-3">Exams</th>
                                <th className="text-left p-3">Last recorded activity</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {teachers.map((t) => (
                                <tr key={t.id}>
                                    <td className="p-3">
                                        <p className="font-medium">{t.fullName}</p>
                                        <p className="text-xs text-gray-500">{t.email}</p>
                                    </td>
                                    <td className="p-3 text-xs text-gray-500">
                                        {t.assignments.length > 0 ? t.assignments.join(", ") : "None"}
                                    </td>
                                    <td className="p-3">{t.questionCount}</td>
                                    <td className="p-3">{t.examCount}</td>
                                    <td className="p-3 text-gray-500 whitespace-nowrap">{fmt(t.lastActivity)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {tab === "questions" && (
                <>
                    <div className="flex gap-3 mb-4 flex-wrap">
                        <select
                            value={teacherFilter}
                            onChange={(e) => setTeacherFilter(e.target.value)}
                            className="border rounded px-3 py-2 bg-white text-sm"
                        >
                            <option value="">All teachers</option>
                            {teachers.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.fullName}
                                </option>
                            ))}
                        </select>
                        <select
                            value={subjectFilter}
                            onChange={(e) => setSubjectFilter(e.target.value)}
                            className="border rounded px-3 py-2 bg-white text-sm"
                        >
                            <option value="">All subjects</option>
                            {subjects.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                        <p className="text-sm text-gray-500 self-center">
                            {questions.length} question(s), newest first (showing up to 500)
                        </p>
                    </div>

                    <div className="bg-white rounded-lg shadow divide-y">
                        {questions.map((q) => (
                            <div key={q.id} className="p-4">
                                <p className="font-medium">{q.questionText}</p>
                                {q.options && (
                                    <ul className="text-sm text-gray-600 mt-1">
                                        {Object.entries(q.options).map(([k, v]) =>
                                            v ? (
                                                <li key={k}>
                                                    {k}. {v}
                                                </li>
                                            ) : null
                                        )}
                                    </ul>
                                )}
                                <p className="text-xs text-gray-500 mt-2">
                                    {q.type}
                                    {q.correctAnswer ? ` • Answer: ${q.correctAnswer}` : ""} • {q.subjectName} • by{" "}
                                    {q.teacherName} • {fmt(q.createdAt)}
                                </p>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {tab === "exams" && (
                <div className="bg-white rounded-lg shadow overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-left p-3">Exam</th>
                                <th className="text-left p-3">Teacher</th>
                                <th className="text-left p-3">Class</th>
                                <th className="text-left p-3">Starts</th>
                                <th className="text-left p-3">Status</th>
                                <th className="text-left p-3">Questions</th>
                                <th className="text-left p-3">Submitted / Started</th>
                                <th className="text-left p-3">Results</th>
                                <th className="p-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {exams.map((e) => (
                                <tr key={e.id}>
                                    <td className="p-3">
                                        <p className="font-medium">{e.title}</p>
                                        <p className="text-xs text-gray-500">{e.subjectName}</p>
                                    </td>
                                    <td className="p-3">{e.teacherName}</td>
                                    <td className="p-3">{e.className}</td>
                                    <td className="p-3 text-gray-500 whitespace-nowrap">{fmt(e.startsAt)}</td>
                                    <td className="p-3 uppercase text-xs">{e.status}</td>
                                    <td className="p-3">{e.questionCount}</td>
                                    <td className="p-3">
                                        {e.submitted} / {e.started}
                                    </td>
                                    <td className="p-3 text-xs">{e.resultsReleased ? "Released" : "Hidden"}</td>
                                    <td className="p-3 whitespace-nowrap space-x-3 text-xs">
                                        <a href={`/teacher/exams/${e.id}/results`} className="text-blue-600 hover:underline">Results</a>
                                        <a href={`/teacher/exams/${e.id}/analytics`} className="text-blue-600 hover:underline">Analytics</a>
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
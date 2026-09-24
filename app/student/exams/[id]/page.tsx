"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

type Question = {
    id: string;
    questionText: string;
    type: string;
    options: Record<string, string> | null;
};

type ExamData = {
    attemptId: string;
    examTitle: string;
    durationMinutes: number;
    startedAt: string;
    endsAt: string;
    questions: Question[];
    savedAnswers: Record<string, string>;
};

export default function TakeExamPage() {
    const { id: examId } = useParams<{ id: string }>();
    const router = useRouter();

    const [examData, setExamData] = useState<ExamData | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answersState, setAnswersState] = useState<Record<string, string>>({});
    const [flagged, setFlagged] = useState<Set<string>>(new Set());
    const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    // const [submitted, setSubmitted] = useState<{ score: number; total: number; pending: boolean } | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [tabSwitches, setTabSwitches] = useState(0);

    const saveTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

    // Start/resume the exam
    useEffect(() => {
        fetch(`/api/student/exams/${examId}/start`, { method: "POST" })
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Could not start exam");
                return data;
            })
            .then((data: ExamData) => {
                setExamData(data);
                setAnswersState(data.savedAnswers || {});

                // Calculate time left based on server-recorded start time
                const startedAt = new Date(data.startedAt).getTime();
                const durationMs = data.durationMinutes * 60 * 1000;
                const examEndsAt = new Date(data.endsAt).getTime();
                const deadline = Math.min(startedAt + durationMs, examEndsAt);
                const remaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
                setSecondsLeft(remaining);
            })
            .catch((err) => setError(err.message));
    }, [examId]);

    // Countdown timer
    useEffect(() => {
        if (secondsLeft === null) return;
        if (secondsLeft <= 0) {
            handleSubmit(true);
            return;
        }
        const timer = setTimeout(() => setSecondsLeft((s) => (s !== null ? s - 1 : null)), 1000);
        return () => clearTimeout(timer);
    }, [secondsLeft]);

    // Tab-switch / blur detection
    useEffect(() => {
        const handleBlur = () => {
            setTabSwitches((prev) => prev + 1);
            fetch(`/api/student/exams/${examId}/flag-violation`, { method: "POST" }).catch(
                () => { } // don't let a logging failure disrupt the exam
            );
        };
        window.addEventListener("blur", handleBlur);
        return () => window.removeEventListener("blur", handleBlur);
    }, [examId]);

    const formatTime = (secs: number) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        return h > 0
            ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
            : `${m}:${s.toString().padStart(2, "0")}`;
    };

    const saveAnswer = useCallback(
        (questionId: string, value: string) => {
            setAnswersState((prev) => ({ ...prev, [questionId]: value }));

            // Debounce save per question
            if (saveTimeoutRef.current[questionId]) {
                clearTimeout(saveTimeoutRef.current[questionId]);
            }
            saveTimeoutRef.current[questionId] = setTimeout(() => {
                fetch(`/api/student/exams/${examId}/save`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ questionId, studentAnswer: value }),
                }).catch((err) => console.error("Auto-save failed:", err));
            }, 800);
        },
        [examId]
    );

    const toggleFlag = (questionId: string) => {
        setFlagged((prev) => {
            const next = new Set(prev);
            if (next.has(questionId)) next.delete(questionId);
            else next.add(questionId);
            return next;
        });
    };

    const handleSubmit = async (auto = false) => {
        if (submitting || submitted) return;

        if (!auto) {
            const unanswered = examData?.questions.filter((q) => !answersState[q.id]).length || 0;
            if (unanswered > 0) {
                const confirmSubmit = confirm(
                    `You have ${unanswered} unanswered question(s). Submit anyway?`
                );
                if (!confirmSubmit) return;
            }
        }

        setSubmitting(true);
        try {
            const res = await fetch(`/api/student/exams/${examId}/submit`, { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Submit failed");
            setSubmitted(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to submit");
        } finally {
            setSubmitting(false);
        }
    };

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="bg-white p-8 rounded-lg shadow text-center max-w-md">
                    <p className="text-red-600 mb-4">{error}</p>
                    <button
                        onClick={() => router.push("/student")}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="bg-white p-8 rounded-lg shadow text-center max-w-md">
                    <h1 className="text-2xl font-bold mb-4 text-gray-900">Exam Submitted</h1>
                    <p className="text-gray-600 mb-4">
                        Your exam has been submitted successfully. Your result will be
                        available on your dashboard once released.
                    </p>
                    <button
                        onClick={() => router.push("/student")}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (!examData || secondsLeft === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-600">Loading exam...</p>
            </div>
        );
    }

    const currentQuestion = examData.questions[currentIndex];
    const answeredCount = Object.keys(answersState).filter((k) => answersState[k]?.trim()).length;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Top bar */}
            <div className="bg-white shadow px-6 py-3 flex items-center justify-between sticky top-0 z-10">
                <h1 className="font-semibold text-gray-900">{examData.examTitle}</h1>
                <div
                    className={`font-mono text-lg font-bold ${secondsLeft < 60 ? "text-red-600" : "text-gray-900"
                        }`}
                >
                    {formatTime(secondsLeft)}
                </div>
            </div>

            <div className="flex flex-1 max-w-6xl mx-auto w-full gap-6 p-6">
                {/* Question navigator sidebar */}
                <div className="w-48 shrink-0">
                    <div className="bg-white rounded-lg shadow p-4 sticky top-20">
                        <p className="text-sm text-gray-500 mb-3">
                            {answeredCount} / {examData.questions.length} answered
                        </p>
                        <div className="grid grid-cols-5 gap-2">
                            {examData.questions.map((q, idx) => {
                                const isAnswered = !!answersState[q.id]?.trim();
                                const isFlagged = flagged.has(q.id);
                                const isCurrent = idx === currentIndex;
                                return (
                                    <button
                                        key={q.id}
                                        onClick={() => setCurrentIndex(idx)}
                                        className={`w-8 h-8 rounded text-xs font-medium border ${isCurrent
                                            ? "bg-blue-600 text-white border-blue-600"
                                            : isFlagged
                                                ? "bg-yellow-100 border-yellow-400 text-yellow-800"
                                                : isAnswered
                                                    ? "bg-green-100 border-green-400 text-green-800"
                                                    : "bg-white border-gray-300 text-gray-600"
                                            }`}
                                    >
                                        {idx + 1}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-4 space-y-1 text-xs text-gray-500">
                            <p><span className="inline-block w-3 h-3 bg-green-100 border border-green-400 rounded mr-2" />Answered</p>
                            <p><span className="inline-block w-3 h-3 bg-yellow-100 border border-yellow-400 rounded mr-2" />Flagged</p>
                            <p><span className="inline-block w-3 h-3 bg-white border border-gray-300 rounded mr-2" />Unanswered</p>
                        </div>
                        <button
                            onClick={() => handleSubmit(false)}
                            disabled={submitting}
                            className="w-full mt-4 bg-red-600 text-white py-2 rounded hover:bg-red-700 disabled:opacity-50 text-sm"
                        >
                            {submitting ? "Submitting..." : "Submit Exam"}
                        </button>
                    </div>
                </div>

                {/* Question area */}
                <div className="flex-1 bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-gray-500">
                            Question {currentIndex + 1} of {examData.questions.length}
                        </p>
                        <button
                            onClick={() => toggleFlag(currentQuestion.id)}
                            className={`text-sm px-3 py-1 rounded border ${flagged.has(currentQuestion.id)
                                ? "bg-yellow-100 border-yellow-400 text-yellow-800"
                                : "border-gray-300 text-gray-600"
                                }`}
                        >
                            {flagged.has(currentQuestion.id) ? "Unflag" : "Flag for review"}
                        </button>
                    </div>

                    <p className="text-lg text-gray-900 mb-6">{currentQuestion.questionText}</p>

                    {currentQuestion.type === "mcq" && currentQuestion.options && (
                        <div className="space-y-3">
                            {Object.entries(currentQuestion.options).map(([key, value]) =>
                                value ? (
                                    <label
                                        key={key}
                                        className={`flex items-center gap-3 p-3 border rounded cursor-pointer ${answersState[currentQuestion.id] === key
                                            ? "border-blue-600 bg-blue-50"
                                            : "border-gray-200"
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name={currentQuestion.id}
                                            checked={answersState[currentQuestion.id] === key}
                                            onChange={() => saveAnswer(currentQuestion.id, key)}
                                        />
                                        <span className="text-gray-900">
                                            <strong>{key}.</strong> {value}
                                        </span>
                                    </label>
                                ) : null
                            )}
                        </div>
                    )}

                    {currentQuestion.type === "true_false" && (
                        <div className="space-y-3">
                            {["True", "False"].map((opt) => (
                                <label
                                    key={opt}
                                    className={`flex items-center gap-3 p-3 border rounded cursor-pointer ${answersState[currentQuestion.id] === opt
                                        ? "border-blue-600 bg-blue-50"
                                        : "border-gray-200"
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name={currentQuestion.id}
                                        checked={answersState[currentQuestion.id] === opt}
                                        onChange={() => saveAnswer(currentQuestion.id, opt)}
                                    />
                                    <span className="text-gray-900">{opt}</span>
                                </label>
                            ))}
                        </div>
                    )}

                    {(currentQuestion.type === "fill_blank" || currentQuestion.type === "essay") && (
                        <textarea
                            value={answersState[currentQuestion.id] || ""}
                            onChange={(e) => saveAnswer(currentQuestion.id, e.target.value)}
                            rows={currentQuestion.type === "essay" ? 8 : 2}
                            className="w-full border rounded px-3 py-2 text-gray-900 bg-white"
                            placeholder="Type your answer here..."
                        />
                    )}

                    <div className="flex justify-between mt-8">
                        <button
                            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                            disabled={currentIndex === 0}
                            className="px-4 py-2 border rounded disabled:opacity-40 text-gray-700"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() =>
                                setCurrentIndex((i) => Math.min(examData.questions.length - 1, i + 1))
                            }
                            disabled={currentIndex === examData.questions.length - 1}
                            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
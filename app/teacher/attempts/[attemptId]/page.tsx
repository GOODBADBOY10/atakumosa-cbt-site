"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DashboardHeader } from "@/app/components/DashboardHeader";

type AnswerDetail = {
  answerId: string;
  questionId: string;
  questionText: string;
  type: string;
  options: Record<string, string> | null;
  correctAnswer: string | null;
  studentAnswer: string | null;
  isCorrect: boolean | null;
  pointsAwarded: number | null;
  teacherComment: string | null;
};

export default function GradeAttemptPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const [answers, setAnswers] = useState<AnswerDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradeInputs, setGradeInputs] = useState<Record<string, { points: string; comment: string }>>({});

  useEffect(() => {
    fetch(`/api/teacher/attempts/${attemptId}`)
      .then((res) => res.json())
      .then((data) => {
        setAnswers(data.answers || []);
        setLoading(false);
      });
  }, [attemptId]);

  const submitGrade = async (answerId: string) => {
    const input = gradeInputs[answerId];
    if (!input || input.points === "") return;

    const res = await fetch(`/api/teacher/answers/${answerId}/grade`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pointsAwarded: Number(input.points),
        teacherComment: input.comment,
      }),
    });

    if (res.ok) {
      setAnswers((prev) =>
        prev.map((a) =>
          a.answerId === answerId
            ? { ...a, pointsAwarded: Number(input.points), teacherComment: input.comment }
            : a
        )
      );
    } else {
      const data = await res.json();
      alert(data.error);
    }
  };

  if (loading) return <p className="p-8">Loading...</p>;

  return (
    <div className="p-8 max-w-4xl mx-auto text-gray-900">
      <DashboardHeader title="Grade Submission" />

      <div className="space-y-6">
        {answers.map((a, idx) => (
          <div key={a.answerId} className="bg-white p-5 rounded-lg shadow">
            <p className="text-sm text-gray-500 mb-1">Question {idx + 1} ({a.type})</p>
            <p className="font-medium mb-3">{a.questionText}</p>

            <div className="bg-gray-50 p-3 rounded mb-3">
              <p className="text-sm text-gray-500 mb-1">Student's answer:</p>
              <p className="text-gray-900">{a.studentAnswer || <em className="text-gray-400">No answer given</em>}</p>
            </div>

            {a.type === "essay" ? (
              <div className="flex gap-3 items-end">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Points</label>
                  <input
                    type="number"
                    min={0}
                    defaultValue={a.pointsAwarded ?? ""}
                    onChange={(e) =>
                      setGradeInputs((prev) => ({
                        ...prev,
                        [a.answerId]: { ...prev[a.answerId], points: e.target.value, comment: prev[a.answerId]?.comment || a.teacherComment || "" },
                      }))
                    }
                    className="border rounded px-3 py-2 w-24 bg-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Comment (optional)</label>
                  <input
                    type="text"
                    defaultValue={a.teacherComment ?? ""}
                    onChange={(e) =>
                      setGradeInputs((prev) => ({
                        ...prev,
                        [a.answerId]: { ...prev[a.answerId], comment: e.target.value, points: prev[a.answerId]?.points ?? String(a.pointsAwarded ?? "") },
                      }))
                    }
                    className="border rounded px-3 py-2 w-full bg-white"
                  />
                </div>
                <button
                  onClick={() => submitGrade(a.answerId)}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Save
                </button>
              </div>
            ) : (
              <p className="text-sm">
                {a.isCorrect ? (
                  <span className="text-green-700 font-medium">Correct</span>
                ) : (
                  <span className="text-red-600 font-medium">
                    Incorrect (Correct answer: {a.correctAnswer})
                  </span>
                )}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
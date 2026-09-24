"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/app/components/DashboardHeader";

type Exam = {
  id: string;
  title: string;
  subjectName: string;
  durationMinutes: number;
  startsAt: string;
  endsAt: string;
  alreadySubmitted: boolean;
  inProgress: boolean;
};

export default function StudentDashboard() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/student/exams")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load exams");
        return res.json();
      })
      .then((data) => {
        setExams(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setExams([]);
        setLoading(false);
      });
  }, []);

  const now = new Date();

  const getExamState = (exam: Exam) => {
    const starts = new Date(exam.startsAt);
    const ends = new Date(exam.endsAt);

    if (exam.alreadySubmitted) return "submitted";
    if (now < starts) return "upcoming";
    if (now > ends) return "expired";
    return "active"; // within window, not submitted (may or may not be in progress)
  };

  return (
    <div className="p-8 max-w-4xl mx-auto text-gray-900">
      <DashboardHeader title="Student Dashboard" />

      <a href="/student/results" className="text-blue-600 hover:underline text-sm font-medium mb-6 inline-block">
        My Results →
      </a>

      {loading ? (
        <p>Loading exams...</p>
      ) : exams.length === 0 ? (
        <p className="text-gray-500">No exams available right now.</p>
      ) : (
        <div className="grid gap-4">
          {exams.map((exam) => {
            const state = getExamState(exam);
            return (
              <div
                key={exam.id}
                className="bg-white p-5 rounded-lg shadow flex items-center justify-between"
              >
                <div>
                  <h2 className="text-lg font-semibold">{exam.title}</h2>
                  <p className="text-sm text-gray-500">
                    {exam.subjectName} • {exam.durationMinutes} mins
                  </p>
                  <p className="text-sm text-gray-500">
                    Window: {new Date(exam.startsAt).toLocaleString()} →{" "}
                    {new Date(exam.endsAt).toLocaleString()}
                  </p>
                </div>

                <div>
                  {state === "submitted" && (
                    <span className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full">
                      Submitted
                    </span>
                  )}
                  {state === "upcoming" && (
                    <span className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                      Not yet open
                    </span>
                  )}
                  {state === "expired" && (
                    <span className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded-full">
                      Closed
                    </span>
                  )}
                  {state === "active" && (
                    <a
                      href={`/student/exams/${exam.id}`}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-medium"
                    >
                      {exam.inProgress ? "Continue Exam" : "Start Exam"}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/app/components/DashboardHeader";

type Result = {
  examTitle: string;
  subjectName: string;
  submittedAt: string;
  resultsReleased: boolean;
  score: number | null;
  totalPossible: number | null;
  gradingComplete: boolean;
};

export default function StudentResultsPage() {
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/student/results")
      .then((res) => res.json())
      .then((data) => {
        setResults(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto text-gray-900">
      <DashboardHeader title="My Results" />

      {loading ? (
        <p>Loading...</p>
      ) : results.length === 0 ? (
        <p className="text-gray-500">You haven't submitted any exams yet.</p>
      ) : (
        <div className="grid gap-3">
          {results.map((r, idx) => (
            <div key={idx} className="bg-white p-4 rounded-lg shadow flex items-center justify-between">
              <div>
                <p className="font-medium">{r.examTitle}</p>
                <p className="text-sm text-gray-500">{r.subjectName}</p>
              </div>
              {!r.resultsReleased ? (
                <span className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                  Not yet released
                </span>
              ) : !r.gradingComplete ? (
                <span className="text-sm bg-orange-100 text-orange-700 px-3 py-1 rounded-full">
                  Grading in progress
                </span>
              ) : (
                <span className="text-lg font-semibold">
                  {r.score} / {r.totalPossible}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
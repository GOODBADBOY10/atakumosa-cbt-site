"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/app/components/DashboardHeader";

type Exam = {
  id: string;
  title: string;
  subjectName: string;
  className: string;
  status: string;
  resultsReleased: boolean;
};

export default function AdminResultsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  const loadExams = () => {
    fetch("/api/admin/exams")
      .then((res) => res.json())
      .then((data) => {
        setExams(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadExams();
  }, []);

  const toggleRelease = async (examId: string, current: boolean) => {
    const res = await fetch(`/api/admin/exams/${examId}/release`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resultsReleased: !current }),
    });
    if (res.ok) loadExams();
  };

  return (
    <div className="p-8 max-w-4xl mx-auto text-gray-900">
      <DashboardHeader title="Results Release" />

      {loading ? (
        <p>Loading...</p>
      ) : exams.length === 0 ? (
        <p className="text-gray-500">No exams found.</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3">Exam</th>
                <th className="text-left p-3">Subject</th>
                <th className="text-left p-3">Class</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Results</th>
                <th className="text-left p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {exams.map((exam) => (
                <tr key={exam.id}>
                  <td className="p-3">{exam.title}</td>
                  <td className="p-3">{exam.subjectName}</td>
                  <td className="p-3">{exam.className}</td>
                  <td className="p-3 uppercase text-xs">{exam.status}</td>
                  <td className="p-3">
                    {exam.resultsReleased ? (
                      <span className="text-green-700 bg-green-100 px-2 py-0.5 rounded-full text-xs">
                        Released
                      </span>
                    ) : (
                      <span className="text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full text-xs">
                        Hidden
                      </span>
                    )}
                  </td>
                  <td className="p-3 flex gap-2">
                    <button
                      onClick={() => toggleRelease(exam.id, exam.resultsReleased)}
                      className={`text-sm px-3 py-1 rounded ${exam.resultsReleased
                        ? "bg-gray-600 text-white hover:bg-gray-700"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                    >
                      {exam.resultsReleased ? "Hide Results" : "Release Results"}
                    </button>
                    <a
                      href={`/api/admin/exams/${exam.id}/export`}
                      className="text-sm px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                    >
                      Export CSV
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      }
    </div >
  );
}
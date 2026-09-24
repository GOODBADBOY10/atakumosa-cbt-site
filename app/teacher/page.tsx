"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "../components/DashboardHeader";

type Assignment = {
  id: string;
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
};

export default function TeacherDashboard() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/teacher/assignments")
      .then((res) => res.json())
      .then((data) => {
        setAssignments(data);
        setLoading(false);
      });
  }, []);

  // Group by subject for cleaner display
  const grouped = assignments.reduce((acc, a) => {
    if (!acc[a.subjectName]) acc[a.subjectName] = [];
    acc[a.subjectName].push(a.className);
    return acc;
  }, {} as Record<string, string[]>);

  return (
    <div className="p-8 max-w-4xl mx-auto text-gray-900">
      
      <DashboardHeader title="Teacher Dashboard" />
      <div className="flex gap-3 mb-6">
        <a href="/teacher/questions" className="text-blue-600 hover:underline text-sm font-medium">
          Question Bank
        </a>
        <a href="/teacher/exams" className="text-blue-600 hover:underline text-sm font-medium">
          Exam Builder
        </a>
      </div>
      
      <p className="text-gray-600 mb-6">
        You can only manage questions and exams for the subjects/classes
        assigned to you below.
      </p>

      {loading ? (
        <p>Loading your assignments...</p>
      ) : assignments.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
          <p className="text-yellow-800">
            You haven't been assigned to any subject/class yet. Contact your
            admin.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {Object.entries(grouped).map(([subject, classNames]) => (
            <div
              key={subject}
              className="bg-white p-5 rounded-lg shadow flex items-center justify-between"
            >
              <div>
                <h2 className="text-lg font-semibold">{subject}</h2>
                <p className="text-sm text-gray-500">
                  Classes: {classNames.join(", ")}
                </p>
              </div>
              <a
                href="/teacher/questions"
                className="bg-blue-600 cursor-pointer text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
              >
                Manage Questions
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
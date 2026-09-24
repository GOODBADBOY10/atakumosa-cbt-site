"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/app/components/DashboardHeader";

type Assignment = {
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
};

type Question = {
  id: string;
  questionText: string;
  type: string;
};

type Exam = {
  id: string;
  title: string;
  status: string;
  durationMinutes: number;
  startsAt: string;
  endsAt: string;
};

export default function TeacherExamsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [myExams, setMyExams] = useState<Exam[]>([]);

  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(30);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [shuffle, setShuffle] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/teacher/assignments")
      .then((res) => res.json())
      .then((data: Assignment[]) => {
        setAssignments(data);
        if (data.length > 0) {
          setSelectedSubjectId(data[0].subjectId);
          setSelectedClassId(data[0].classId);
        }
      });
    loadMyExams();
  }, []);

  useEffect(() => {
    if (!selectedSubjectId) return;
    fetch(`/api/teacher/questions?subjectId=${selectedSubjectId}`)
      .then((res) => res.json())
      .then((data) => setQuestions(Array.isArray(data) ? data : []));
    setSelectedQuestionIds([]);
  }, [selectedSubjectId]);

  const loadMyExams = () => {
    fetch("/api/teacher/exams")
      .then((res) => res.json())
      .then((data) => setMyExams(Array.isArray(data) ? data : []));
  };

  // Unique subjects and, for the chosen subject, the classes this teacher can use it with
  const subjectOptions = Array.from(
    new Map(assignments.map((a) => [a.subjectId, a.subjectName])).entries()
  );
  const classOptionsForSubject = assignments.filter(
    (a) => a.subjectId === selectedSubjectId
  );

  const toggleQuestion = (id: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id]
    );
  };

  const createExam = async () => {
    setMessage("");

    if (!title.trim()) return setMessage("Title is required");
    if (!selectedClassId) return setMessage("Select a class");
    if (!startsAt || !endsAt) return setMessage("Set start and end time");
    if (selectedQuestionIds.length === 0)
      return setMessage("Select at least one question");

    const res = await fetch("/api/teacher/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        subjectId: selectedSubjectId,
        classId: selectedClassId,
        durationMinutes: Number(duration),
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        shuffleQuestions: shuffle,
        questionIds: selectedQuestionIds,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      setMessage(`Exam "${title}" created as draft`);
      setTitle("");
      setSelectedQuestionIds([]);
      setStartsAt("");
      setEndsAt("");
      loadMyExams();
    } else {
      setMessage(`Error: ${data.error}`);
    }
  };

  const updateStatus = async (examId: string, status: string) => {
    const res = await fetch(`/api/teacher/exams/${examId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) loadMyExams();
    else {
      const data = await res.json();
      alert(data.error);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto text-gray-900">
      <DashboardHeader title="Exam Builder" />

      {assignments.length === 0 ? (
        <p className="text-gray-500">No assigned subjects/classes yet.</p>
      ) : (
        <>
          <section className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-lg font-semibold mb-4">Create New Exam</h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Subject</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full border rounded px-3 py-2 bg-white"
                >
                  {subjectOptions.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Class</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full border rounded px-3 py-2 bg-white"
                >
                  {classOptionsForSubject.map((a) => (
                    <option key={a.classId} value={a.classId}>
                      {a.className}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="block text-sm font-medium mb-1">Exam Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mathematics Mid-Term Test"
              className="w-full border rounded px-3 py-2 mb-4 bg-white"
            />

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full border rounded px-3 py-2 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Starts At</label>
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="w-full border rounded px-3 py-2 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ends At</label>
                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="w-full border rounded px-3 py-2 bg-white"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 mb-4 text-sm">
              <input
                type="checkbox"
                checked={shuffle}
                onChange={(e) => setShuffle(e.target.checked)}
              />
              Shuffle question order per student
            </label>

            <h3 className="font-medium mb-2">
              Select Questions ({selectedQuestionIds.length} selected)
            </h3>
            <div className="border rounded p-3 mb-4 max-h-64 overflow-y-auto">
              {questions.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No questions in this subject yet. Add some in the Question Bank first.
                </p>
              ) : (
                questions.map((q) => (
                  <label
                    key={q.id}
                    className="flex items-start gap-2 py-2 border-b last:border-0 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedQuestionIds.includes(q.id)}
                      onChange={() => toggleQuestion(q.id)}
                      className="mt-1"
                    />
                    <span>
                      {q.questionText}{" "}
                      <span className="text-gray-400">({q.type})</span>
                    </span>
                  </label>
                ))
              )}
            </div>

            <button
              onClick={createExam}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Create Exam (Draft)
            </button>
            {message && <p className="mt-2 text-sm">{message}</p>}
          </section>

          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">My Exams</h2>
            {myExams.length === 0 ? (
              <p className="text-sm text-gray-500">No exams created yet.</p>
            ) : (
              <ul className="divide-y">
                {myExams.map((exam) => (
                  <li
                    key={exam.id}
                    className="py-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{exam.title}</p>
                      <p className="text-sm text-gray-500">
                        {exam.durationMinutes} mins •{" "}
                        {new Date(exam.startsAt).toLocaleString()} →{" "}
                        {new Date(exam.endsAt).toLocaleString()} •{" "}
                        <span className="uppercase font-medium">
                          {exam.status}
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-2 items-center">
                      {exam.status === "draft" && (
                        <button onClick={() => updateStatus(exam.id, "published")} className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
                          Publish
                        </button>
                      )}
                      {exam.status === "published" && (
                        <button onClick={() => updateStatus(exam.id, "closed")} className="text-sm bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700">
                          Close
                        </button>
                      )}
                      <a href={`/teacher/exams/${exam.id}/results`} className="text-sm text-blue-600 hover:underline">
                        View Results
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
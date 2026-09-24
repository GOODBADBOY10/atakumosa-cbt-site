"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/app/components/DashboardHeader";
import * as XLSX from "xlsx";

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
  options: Record<string, string> | null;
  correctAnswer: string | null;
  topic: string | null;
  difficulty: string | null;
};

export default function TeacherQuestionsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);

  // Manual form state
  const [qType, setQType] = useState("mcq");
  const [qText, setQText] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");

  // Bulk upload state
  const [file, setFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch("/api/teacher/assignments")
      .then((res) => res.json())
      .then((data: Assignment[]) => {
        setAssignments(data);
        const uniqueSubjects = Array.from(
          new Map(data.map((a) => [a.subjectId, { id: a.subjectId, name: a.subjectName }])).values()
        );
        setSubjects(uniqueSubjects);
        if (uniqueSubjects.length > 0) setSelectedSubject(uniqueSubjects[0].id);
      });
  }, []);

  useEffect(() => {
    if (!selectedSubject) return;
    fetch(`/api/teacher/questions?subjectId=${selectedSubject}`)
      .then((res) => res.json())
      .then((data) => setQuestions(Array.isArray(data) ? data : []));
  }, [selectedSubject]);

  const refreshQuestions = () => {
    fetch(`/api/teacher/questions?subjectId=${selectedSubject}`)
      .then((res) => res.json())
      .then((data) => setQuestions(Array.isArray(data) ? data : []));
  };

  const createQuestion = async () => {
    setMessage("");
    if (!qText.trim()) {
      setMessage("Question text is required");
      return;
    }

    const options =
      qType === "mcq"
        ? { A: optionA, B: optionB, C: optionC, D: optionD }
        : qType === "true_false"
          ? { A: "True", B: "False" }
          : undefined;

    const res = await fetch("/api/teacher/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectId: selectedSubject,
        type: qType,
        questionText: qText,
        options,
        correctAnswer: correctAnswer || undefined,
        topic: topic || undefined,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      setMessage("Question added successfully");
      setQText("");
      setOptionA("");
      setOptionB("");
      setOptionC("");
      setOptionD("");
      setCorrectAnswer("");
      setTopic("");
      refreshQuestions();
    } else {
      setMessage(`Error: ${data.error}`);
    }
  };

  const handleUpload = async () => {
    setUploadMessage("");
    setUploadErrors([]);
    if (!file || !selectedSubject) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("subjectId", selectedSubject);

    const res = await fetch("/api/teacher/questions/bulk-upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setUploading(false);

    if (res.ok) {
      setUploadMessage(data.message);
      setFile(null);
      refreshQuestions();
    } else {
      setUploadMessage(data.error);
      setUploadErrors(data.details || []);
    }
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;

    const res = await fetch(`/api/teacher/questions/${id}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (res.ok) {
      refreshQuestions();
    } else {
      alert(data.error);
    }
  };

  const downloadQuestionTemplate = () => {
    const templateData = [
      {
        Question: "What is the capital of Nigeria?",
        Type: "mcq",
        OptionA: "Lagos",
        OptionB: "Abuja",
        OptionC: "Kano",
        OptionD: "Ibadan",
        CorrectAnswer: "B",
        Topic: "Geography",
        Difficulty: "easy",
      },
      {
        Question: "The sun rises in the East.",
        Type: "true_false",
        OptionA: "",
        OptionB: "",
        OptionC: "",
        OptionD: "",
        CorrectAnswer: "True",
        Topic: "General Knowledge",
        Difficulty: "easy",
      },
      {
        Question: "",
        Type: "",
        OptionA: "",
        OptionB: "",
        OptionC: "",
        OptionD: "",
        CorrectAnswer: "",
        Topic: "",
        Difficulty: "",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet["!cols"] = [
      { wch: 40 }, // Question
      { wch: 12 }, // Type
      { wch: 15 }, // OptionA
      { wch: 15 }, // OptionB
      { wch: 15 }, // OptionC
      { wch: 15 }, // OptionD
      { wch: 15 }, // CorrectAnswer
      { wch: 15 }, // Topic
      { wch: 12 }, // Difficulty
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Questions");

    XLSX.writeFile(workbook, "question_upload_template.xlsx");
  };

  return (
    <div className="p-8 max-w-5xl mx-auto text-gray-900">
      <DashboardHeader title="Question Bank" />

      {subjects.length === 0 ? (
        <p className="text-gray-500">
          You have no assigned subjects yet. Contact your admin.
        </p>
      ) : (
        <>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="border rounded px-3 py-2 text-gray-900 bg-white"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Bulk upload */}
          <section className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-lg font-semibold mb-3">Bulk Upload (Excel/CSV)</h2>
            <p className="text-sm text-gray-500 mb-3">
              Columns required: Question, Type (mcq/true_false/fill_blank/essay),
              OptionA, OptionB, OptionC, OptionD, CorrectAnswer, Topic, Difficulty
            </p>
            <button
              onClick={downloadQuestionTemplate}
              className="text-sm text-blue-600 hover:underline mb-4 inline-block"
            >
              📥 Download Excel Template
            </button>
            <div className="flex items-center gap-3 mb-3">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="text-sm"
              />
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
            {uploadMessage && (
              <p className="text-sm mb-2 font-medium">{uploadMessage}</p>
            )}
            {uploadErrors.length > 0 && (
              <ul className="text-sm text-red-600 list-disc pl-5 max-h-40 overflow-y-auto">
                {uploadErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </section>

          {/* Manual entry */}
          <section className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-lg font-semibold mb-3">Add Question Manually</h2>

            <label className="block text-sm font-medium mb-1">Question Type</label>
            <select
              value={qType}
              onChange={(e) => setQType(e.target.value)}
              className="border rounded px-3 py-2 mb-3 text-gray-900 bg-white"
            >
              <option value="mcq">Multiple Choice</option>
              <option value="true_false">True/False</option>
              <option value="fill_blank">Fill in the Blank</option>
              <option value="essay">Essay</option>
            </select>

            <label className="block text-sm font-medium mb-1">Question Text</label>
            <textarea
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-3 text-gray-900 bg-white"
              rows={2}
            />

            {qType === "mcq" && (
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input placeholder="Option A" value={optionA} onChange={(e) => setOptionA(e.target.value)} className="border rounded px-3 py-2 text-gray-900 bg-white" />
                <input placeholder="Option B" value={optionB} onChange={(e) => setOptionB(e.target.value)} className="border rounded px-3 py-2 text-gray-900 bg-white" />
                <input placeholder="Option C" value={optionC} onChange={(e) => setOptionC(e.target.value)} className="border rounded px-3 py-2 text-gray-900 bg-white" />
                <input placeholder="Option D" value={optionD} onChange={(e) => setOptionD(e.target.value)} className="border rounded px-3 py-2 text-gray-900 bg-white" />
              </div>
            )}

            {(qType === "mcq" || qType === "true_false" || qType === "fill_blank") && (
              <>
                <label className="block text-sm font-medium mb-1">Correct Answer</label>
                <input
                  value={correctAnswer}
                  onChange={(e) => setCorrectAnswer(e.target.value)}
                  placeholder={qType === "mcq" ? "A, B, C or D" : qType === "true_false" ? "True or False" : "Exact answer"}
                  className="w-full border rounded px-3 py-2 mb-3 text-gray-900 bg-white"
                />
              </>
            )}

            <label className="block text-sm font-medium mb-1">Topic (optional)</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-3 text-gray-900 bg-white"
            />

            <button
              onClick={createQuestion}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Add Question
            </button>
            {message && <p className="mt-2 text-sm">{message}</p>}
          </section>

          {/* Existing questions */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">
              Questions in this subject ({questions.length})
            </h2>
            {questions.length === 0 ? (
              <p className="text-sm text-gray-500">No questions yet.</p>
            ) : (
              <ul className="divide-y">
                {questions.map((q) => (
                  <li key={q.id} className="py-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">{q.questionText}</p>
                      <p className="text-sm text-gray-500">
                        Type: {q.type} {q.correctAnswer && `• Answer: ${q.correctAnswer}`}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteQuestion(q.id)}
                      className="text-sm text-red-600 hover:text-red-800 whitespace-nowrap"
                    >
                      Delete
                    </button>
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
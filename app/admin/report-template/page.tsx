"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/app/components/DashboardHeader";

type Subject = { id: string; name: string };
type Class = { id: string; name: string };
type ExamOption = { id: string; title: string; startsAt: string; status: string };
type Student = { id: string; fullName: string; regNumber: string | null };

export default function ReportTemplatePage() {
    const [mode, setMode] = useState<"bySubject" | "byStudent">("byStudent");

    // Shared
    const [classes, setClasses] = useState<Class[]>([]);
    const [selectedClass, setSelectedClass] = useState("");

    // "By subject" mode state
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedSubject, setSelectedSubject] = useState("");
    const [examOptions, setExamOptions] = useState<ExamOption[]>([]);
    const [selectedExam, setSelectedExam] = useState("none");

    // "By student" mode state
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState("all"); // "all" = whole class, one sheet per student

    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        Promise.all([
            fetch("/api/admin/subjects").then((r) => r.json()),
            fetch("/api/admin/classes").then((r) => r.json()),
        ]).then(([subs, cls]) => {
            setSubjects(subs);
            setClasses(cls);
            if (subs.length > 0) setSelectedSubject(subs[0].id);
            if (cls.length > 0) setSelectedClass(cls[0].id);
        });
    }, []);

    // Load exams for "by subject" mode
    useEffect(() => {
        if (mode !== "bySubject" || !selectedSubject || !selectedClass) return;
        fetch(`/api/admin/subject-exams?subjectId=${selectedSubject}&classId=${selectedClass}`)
            .then((res) => res.json())
            .then((data) => {
                setExamOptions(Array.isArray(data) ? data : []);
                setSelectedExam("none");
            });
    }, [mode, selectedSubject, selectedClass]);

    // Load students for "by student" mode
    useEffect(() => {
        if (mode !== "byStudent" || !selectedClass) return;
        fetch(`/api/admin/class-students?classId=${selectedClass}`)
            .then((res) => res.json())
            .then((data) => {
                setStudents(Array.isArray(data) ? data : []);
                setSelectedStudent("all");
            });
    }, [mode, selectedClass]);

    const handleGenerateBySubject = () => {
        if (!selectedSubject || !selectedClass) return;
        setGenerating(true);
        window.location.href = `/api/admin/report-template?subjectId=${selectedSubject}&classId=${selectedClass}&examId=${selectedExam}`;
        setTimeout(() => setGenerating(false), 1500);
    };

    const handleGenerateByStudent = () => {
        if (!selectedClass) return;
        setGenerating(true);
        const studentParam = selectedStudent === "all" ? "" : `&studentId=${selectedStudent}`;
        window.location.href = `/api/admin/student-report?classId=${selectedClass}${studentParam}`;
        setTimeout(() => setGenerating(false), 1500);
    };

    return (
        <div className="p-8 max-w-2xl mx-auto text-gray-900">
            <DashboardHeader title="Generate Result Sheet" />

            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setMode("byStudent")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${mode === "byStudent" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                        }`}
                >
                    Per Student (all subjects)
                </button>
                <button
                    onClick={() => setMode("bySubject")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${mode === "bySubject" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                        }`}
                >
                    Per Subject (all students)
                </button>
            </div>

            {mode === "byStudent" ? (
                <>
                    <p className="text-sm text-gray-500 mb-6">
                        Generates a sheet listing all subjects a student has been examined on
                        via the CBT platform, with their exam score already filled in for
                        each. Teachers add CA1, CA2 per subject — the Total per row
                        calculates itself. Choose "Whole Class" to get one file with a
                        separate tab for every student.
                    </p>

                    <div className="bg-white p-6 rounded-lg shadow space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Class</label>
                            <select
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                                className="w-full border rounded px-3 py-2 bg-white"
                            >
                                {classes.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Student</label>
                            <select
                                value={selectedStudent}
                                onChange={(e) => setSelectedStudent(e.target.value)}
                                className="w-full border rounded px-3 py-2 bg-white"
                            >
                                <option value="all">— Whole Class (one file, one tab per student) —</option>
                                {students.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.fullName} {s.regNumber ? `(${s.regNumber})` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={handleGenerateByStudent}
                            disabled={generating || !selectedClass}
                            className="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                        >
                            {generating ? "Generating..." : "Generate & Download"}
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <p className="text-sm text-gray-500 mb-6">
                        Creates a sheet listing every student in a class for one subject,
                        with their exam score already filled in.
                    </p>

                    <div className="bg-white p-6 rounded-lg shadow space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Subject</label>
                            <select
                                value={selectedSubject}
                                onChange={(e) => setSelectedSubject(e.target.value)}
                                className="w-full border rounded px-3 py-2 bg-white"
                            >
                                {subjects.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Class</label>
                            <select
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                                className="w-full border rounded px-3 py-2 bg-white"
                            >
                                {classes.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Which exam's score should fill the "Exam Score" column?
                            </label>
                            <select
                                value={selectedExam}
                                onChange={(e) => setSelectedExam(e.target.value)}
                                className="w-full border rounded px-3 py-2 bg-white"
                            >
                                <option value="none">Leave blank (no exam selected)</option>
                                {examOptions.map((exam) => (
                                    <option key={exam.id} value={exam.id}>
                                        {exam.title} — {new Date(exam.startsAt).toLocaleDateString()} ({exam.status})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={handleGenerateBySubject}
                            disabled={generating || !selectedSubject || !selectedClass}
                            className="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                        >
                            {generating ? "Generating..." : "Generate & Download"}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
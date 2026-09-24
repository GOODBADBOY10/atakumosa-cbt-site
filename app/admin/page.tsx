"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "../components/DashboardHeader";
import * as XLSX from "xlsx";

type Subject = { id: string; name: string };
type Class = { id: string; name: string };
type Assignment = { subjectId: string; classId: string };

export default function AdminDashboard() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [newSubject, setNewSubject] = useState("");
  const [newClass, setNewClass] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [selectedAssignments, setSelectedAssignments] = useState<Assignment[]>([]);
  const [message, setMessage] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentRegNumber, setStudentRegNumber] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [studentClassId, setStudentClassId] = useState("");
  const [studentMessage, setStudentMessage] = useState("");
  const [studentFile, setStudentFile] = useState<File | null>(null);
  const [studentUploadMessage, setStudentUploadMessage] = useState("");
  const [studentUploadErrors, setStudentUploadErrors] = useState<string[]>([]);
  const [uploadingStudents, setUploadingStudents] = useState(false);

  const loadData = async () => {
    const [subRes, classRes] = await Promise.all([
      fetch("/api/admin/subjects"),
      fetch("/api/admin/classes"),
    ]);
    setSubjects(await subRes.json());
    setClasses(await classRes.json());
  };

  useEffect(() => {
    loadData();
  }, []);

  const addSubject = async () => {
    if (!newSubject.trim()) return;
    await fetch("/api/admin/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newSubject }),
    });
    setNewSubject("");
    loadData();
  };

  const addClass = async () => {
    if (!newClass.trim()) return;
    await fetch("/api/admin/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newClass }),
    });
    setNewClass("");
    loadData();
  };

  const toggleAssignment = (subjectId: string, classId: string) => {
    const exists = selectedAssignments.some(
      (a) => a.subjectId === subjectId && a.classId === classId
    );
    if (exists) {
      setSelectedAssignments(
        selectedAssignments.filter(
          (a) => !(a.subjectId === subjectId && a.classId === classId)
        )
      );
    } else {
      setSelectedAssignments([...selectedAssignments, { subjectId, classId }]);
    }
  };

  const createTeacher = async () => {
    setMessage("");
    if (!teacherName || !teacherEmail || !teacherPassword) {
      setMessage("Please fill in all teacher fields");
      return;
    }

    const res = await fetch("/api/admin/teachers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: teacherName,
        email: teacherEmail,
        password: teacherPassword,
        assignments: selectedAssignments,
      }),
    });

    if (res.ok) {
      setMessage(`Teacher "${teacherName}" created successfully`);
      setTeacherName("");
      setTeacherEmail("");
      setTeacherPassword("");
      setSelectedAssignments([]);
    } else {
      const err = await res.json();
      setMessage(`Error: ${err.error || "Failed to create teacher"}`);
    }
  };

  const createStudent = async () => {
    setStudentMessage("");
    if (!studentName || !studentRegNumber || !studentPassword || !studentClassId) {
      setStudentMessage("Please fill in all fields and select a class");
      return;
    }

    const res = await fetch("/api/admin/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: studentName,
        regNumber: studentRegNumber,
        password: studentPassword,
        classId: studentClassId,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      setStudentMessage(`Student "${studentName}" created successfully`);
      setStudentName("");
      setStudentRegNumber("");
      setStudentPassword("");
    } else {
      setStudentMessage(`Error: ${data.error}`);
    }
  };

  const handleStudentBulkUpload = async () => {
    setStudentUploadMessage("");
    setStudentUploadErrors([]);
    if (!studentFile) return;

    setUploadingStudents(true);
    const formData = new FormData();
    formData.append("file", studentFile);

    const res = await fetch("/api/admin/students/bulk-upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setUploadingStudents(false);

    if (res.ok) {
      setStudentUploadMessage(data.message);
      setStudentFile(null);
    } else {
      setStudentUploadMessage(data.error);
      setStudentUploadErrors(data.details || []);
    }
  };

  const downloadStudentTemplate = () => {
    const templateData = [
      { FullName: "Chidinma Okoro", RegNumber: "STU001", ClassName: "JSS2A", Password: "" },
      { FullName: "Tunde Bello", RegNumber: "STU002", ClassName: "JSS2A", Password: "" },
      { FullName: "", RegNumber: "", ClassName: "", Password: "" },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Set reasonable column widths so it's readable when opened
    worksheet["!cols"] = [
      { wch: 25 }, // FullName
      { wch: 15 }, // RegNumber
      { wch: 15 }, // ClassName
      { wch: 15 }, // Password
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

    XLSX.writeFile(workbook, "student_upload_template.xlsx");
  };

  return (
    <div className="p-8 max-w-4xl mx-auto text-gray-900">
      <DashboardHeader title="Admin Dashboard" />

      <a href="/admin/results" className="text-blue-600 hover:underline text-sm font-medium mb-6 inline-block">
        Manage Results Release →
      </a>

      <a href="/admin/audit-logs" className="text-blue-600 hover:underline text-sm font-medium mb-6 ml-4 inline-block">
        View Audit Log →
      </a>

      {/* Subjects */}
      <section className="mb-10 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Subjects</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            placeholder="e.g. Mathematics"
            className="border rounded px-3 py-2 flex-1 text-gray-900 bg-white"
          />
          <button
            onClick={addSubject}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Add Subject
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {subjects.map((s) => (
            <span
              key={s.id}
              className="bg-gray-100 px-3 py-1 rounded-full text-sm"
            >
              {s.name}
            </span>
          ))}
        </div>
      </section>

      {/* Classes */}
      <section className="mb-10 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Classes</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newClass}
            onChange={(e) => setNewClass(e.target.value)}
            placeholder="e.g. JSS2A"
            className="border rounded px-3 py-2 flex-1 text-gray-900 bg-white"
          />
          <button
            onClick={addClass}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Add Class
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {classes.map((c) => (
            <span
              key={c.id}
              className="bg-gray-100 px-3 py-1 rounded-full text-sm"
            >
              {c.name}
            </span>
          ))}
        </div>
      </section>

      {/* Create Teacher */}
      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Create Teacher</h2>

        <div className="grid gap-3 mb-4">
          <input
            type="text"
            placeholder="Full Name"
            value={teacherName}
            onChange={(e) => setTeacherName(e.target.value)}
            className="border rounded px-3 py-2 text-gray-900 bg-white"
          />
          <input
            type="email"
            placeholder="Email"
            value={teacherEmail}
            onChange={(e) => setTeacherEmail(e.target.value)}
            className="border rounded px-3 py-2 text-gray-900 bg-white"
          />
          <input
            type="text"
            placeholder="Temporary Password"
            value={teacherPassword}
            onChange={(e) => setTeacherPassword(e.target.value)}
            className="border rounded px-3 py-2 text-gray-900 bg-white"
          />
        </div>

        <h3 className="font-medium mb-2">
          Assign Subject + Class combinations:
        </h3>
        <div className="border rounded p-3 mb-4 max-h-64 overflow-y-auto">
          {subjects.length === 0 || classes.length === 0 ? (
            <p className="text-sm text-gray-500">
              Add at least one subject and one class first.
            </p>
          ) : (
            subjects.map((subject) => (
              <div key={subject.id} className="mb-3">
                <p className="font-medium text-sm mb-1">{subject.name}</p>
                <div className="flex flex-wrap gap-2">
                  {classes.map((cls) => {
                    const isSelected = selectedAssignments.some(
                      (a) => a.subjectId === subject.id && a.classId === cls.id
                    );
                    return (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => toggleAssignment(subject.id, cls.id)}
                        className={`px-3 py-1 rounded-full text-sm border ${isSelected
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-700 border-gray-300"
                          }`}
                      >
                        {cls.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <button
          onClick={createTeacher}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Create Teacher
        </button>

        {message && <p className="mt-3 text-sm">{message}</p>}
      </section>

      {/* Bulk Upload Students */}
      <section className="bg-white p-6 rounded-lg shadow mt-10">
        <h2 className="text-xl font-semibold mb-4">Bulk Upload Students (Excel/CSV)</h2>
        <p className="text-sm text-gray-500 mb-3">
          Columns required: FullName, RegNumber, ClassName (must match an existing class name exactly), Password (optional — if left blank, each student's temporary password will be their own Registration Number)
        </p>
        <button
          onClick={downloadStudentTemplate}
          className="text-sm text-blue-600 hover:underline mb-4 inline-block"
        >
          📥 Download Excel Template
        </button>
        <div className="mb-3"></div>
        <div className="flex items-center gap-3 mb-3">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setStudentFile(e.target.files?.[0] || null)}
            className="text-sm"
          />
          <button
            onClick={handleStudentBulkUpload}
            disabled={!studentFile || uploadingStudents}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {uploadingStudents ? "Uploading..." : "Upload"}
          </button>
        </div>
        {studentUploadMessage && (
          <p className="text-sm mb-2 font-medium">{studentUploadMessage}</p>
        )}
        {studentUploadErrors.length > 0 && (
          <ul className="text-sm text-red-600 list-disc pl-5 max-h-40 overflow-y-auto">
            {studentUploadErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        )}
      </section>

      {/* Create Student */}
      <section className="bg-white p-6 rounded-lg shadow mt-10">
        <h2 className="text-xl font-semibold mb-4">Create Student</h2>

        <div className="grid gap-3 mb-4">
          <input
            type="text"
            placeholder="Full Name"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            className="border rounded px-3 py-2 text-gray-900 bg-white"
          />
          <input
            type="text"
            placeholder="Registration Number"
            value={studentRegNumber}
            onChange={(e) => setStudentRegNumber(e.target.value)}
            className="border rounded px-3 py-2 text-gray-900 bg-white"
          />
          <input
            type="text"
            placeholder="Temporary Password"
            value={studentPassword}
            onChange={(e) => setStudentPassword(e.target.value)}
            className="border rounded px-3 py-2 text-gray-900 bg-white"
          />
          <select
            value={studentClassId}
            onChange={(e) => setStudentClassId(e.target.value)}
            className="border rounded px-3 py-2 text-gray-900 bg-white"
          >
            <option value="">Select Class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={createStudent}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Create Student
        </button>

        {studentMessage && <p className="mt-3 text-sm">{studentMessage}</p>}
      </section>

    </div>
  );
}
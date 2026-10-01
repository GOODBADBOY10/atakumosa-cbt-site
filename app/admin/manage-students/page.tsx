"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/app/components/DashboardHeader";

type Student = { id: string; fullName: string; regNumber: string | null; className: string; classId: string };
type ClassOption = { id: string; name: string };

export default function ManageStudentsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [classFilter, setClassFilter] = useState("all");
    const [message, setMessage] = useState("");

    useEffect(() => {
        fetch("/api/admin/all-students")
            .then((res) => res.json())
            .then((data) => setStudents(Array.isArray(data) ? data : []));
    }, []);

    const classOptions: ClassOption[] = Array.from(
        new Map(students.map((s) => [s.classId, { id: s.classId, name: s.className }])).values()
    );

    const deleteStudent = async (id: string, name: string) => {
        if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
        const res = await fetch(`/api/admin/students/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (res.ok) {
            setMessage(data.message);
            setStudents((prev) => prev.filter((s) => s.id !== id));
        } else {
            setMessage(`Error: ${data.error}`);
        }
    };

    const filtered =
        classFilter === "all" ? students : students.filter((s) => s.classId === classFilter);

    return (
        <div className="p-8 max-w-3xl mx-auto text-gray-900">
            <DashboardHeader title="All Students" />

            {message && (
                <p className="text-sm bg-blue-50 border border-blue-200 text-blue-700 rounded-lg px-4 py-2 mb-4">
                    {message}
                </p>
            )}

            <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">{filtered.length} student(s)</p>
                <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="border rounded px-3 py-2 bg-white text-sm"
                >
                    <option value="all">All Classes</option>
                    {classOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="text-left p-3">Name</th>
                            <th className="text-left p-3">Reg. Number</th>
                            <th className="text-left p-3">Class</th>
                            <th className="text-left p-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filtered.map((s) => (
                            <tr key={s.id}>
                                <td className="p-3">{s.fullName}</td>
                                <td className="p-3 text-gray-500">{s.regNumber}</td>
                                <td className="p-3 text-gray-500">{s.className}</td>
                                <td className="p-3">
                                    <button
                                        onClick={() => deleteStudent(s.id, s.fullName)}
                                        className="text-red-600 hover:underline text-sm"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
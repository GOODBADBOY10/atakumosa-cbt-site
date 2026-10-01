"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/app/components/DashboardHeader";

type Student = { id: string; fullName: string; regNumber: string | null; className: string; classId: string };
type ClassOption = { id: string; name: string };

export default function ManageStudentsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [classFilter, setClassFilter] = useState("all");

    useEffect(() => {
        fetch("/api/admin/all-students")
            .then((res) => res.json())
            .then((data) => setStudents(Array.isArray(data) ? data : []));
    }, []);

    const classOptions: ClassOption[] = Array.from(
        new Map(students.map((s) => [s.classId, { id: s.classId, name: s.className }])).values()
    );

    const filtered =
        classFilter === "all" ? students : students.filter((s) => s.classId === classFilter);

    return (
        <div className="p-8 max-w-3xl mx-auto text-gray-900">
            <DashboardHeader title="All Students" />

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
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filtered.map((s) => (
                            <tr key={s.id}>
                                <td className="p-3">{s.fullName}</td>
                                <td className="p-3 text-gray-500">{s.regNumber}</td>
                                <td className="p-3 text-gray-500">{s.className}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
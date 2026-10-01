"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/app/components/DashboardHeader";

type Teacher = {
    id: string;
    fullName: string;
    email: string;
    assignments: string[];
};

export default function ManageTeachersPage() {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [message, setMessage] = useState("");

    const load = () => {
        fetch("/api/admin/teachers")
            .then((res) => res.json())
            .then((data) => setTeachers(Array.isArray(data) ? data : []));
    };

    useEffect(() => {
        load();
    }, []);

    const deleteTeacher = async (id: string, name: string) => {
        if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
        const res = await fetch(`/api/admin/teachers/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (res.ok) {
            setMessage(data.message);
            load();
        } else {
            setMessage(`Error: ${data.error}`);
        }
    };

    return (
        <div className="p-8 max-w-3xl mx-auto text-gray-900">
            <DashboardHeader title="Manage Teachers" />

            {message && (
                <p className="text-sm bg-blue-50 border border-blue-200 text-blue-700 rounded-lg px-4 py-2 mb-4">
                    {message}
                </p>
            )}

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="text-left p-3">Name</th>
                            <th className="text-left p-3">Email</th>
                            <th className="text-left p-3">Assigned to</th>
                            <th className="text-left p-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {teachers.map((t) => (
                            <tr key={t.id}>
                                <td className="p-3">{t.fullName}</td>
                                <td className="p-3 text-gray-500">{t.email}</td>
                                <td className="p-3 text-gray-500 text-xs">
                                    {t.assignments.length > 0 ? t.assignments.join(", ") : "None"}
                                </td>
                                <td className="p-3">
                                    <button
                                        onClick={() => deleteTeacher(t.id, t.fullName)}
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
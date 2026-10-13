"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/app/components/DashboardHeader";

type Student = {
    id: string;
    fullName: string;
    regNumber: string | null;
    className: string | null;
    classId: string | null;
};
type ClassOption = { id: string; name: string };

export default function ManageStudentsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [classes, setClasses] = useState<ClassOption[]>([]);
    const [classFilter, setClassFilter] = useState("all");
    const [message, setMessage] = useState("");

    const [editing, setEditing] = useState<Student | null>(null);
    const [editName, setEditName] = useState("");
    const [editReg, setEditReg] = useState("");
    const [editClassId, setEditClassId] = useState("");
    const [editPassword, setEditPassword] = useState("");
    const [editError, setEditError] = useState("");
    const [saving, setSaving] = useState(false);

    const loadStudents = () => {
        fetch("/api/admin/all-students")
            .then((res) => res.json())
            .then((data) => setStudents(Array.isArray(data) ? data : []));
    };

    useEffect(() => {
        loadStudents();
        fetch("/api/admin/classes")
            .then((res) => res.json())
            .then((data) => setClasses(Array.isArray(data) ? data : []));
    }, []);

    const filtered =
        classFilter === "all"
            ? students
            : classFilter === "none"
                ? students.filter((s) => !s.classId)
                : students.filter((s) => s.classId === classFilter);

    const openEdit = (s: Student) => {
        setEditing(s);
        setEditName(s.fullName);
        setEditReg(s.regNumber ?? "");
        setEditClassId(s.classId ?? "");
        setEditPassword("");
        setEditError("");
    };

    const saveEdit = async () => {
        if (!editing || saving) return;

        // Only send what actually changed
        const body: Record<string, string> = {};
        if (editName.trim() !== editing.fullName) body.fullName = editName.trim();
        if (editReg.trim() !== (editing.regNumber ?? "")) body.regNumber = editReg.trim();
        if (editClassId && editClassId !== (editing.classId ?? "")) body.classId = editClassId;
        if (editPassword.trim()) body.password = editPassword.trim();

        if (Object.keys(body).length === 0) {
            setEditError("No changes made");
            return;
        }

        setSaving(true);
        setEditError("");
        try {
            const res = await fetch(`/api/admin/students/${editing.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (res.ok) {
                setMessage(`${editName.trim()} updated successfully`);
                setEditing(null);
                loadStudents();
            } else {
                setEditError(data.error || "Could not save changes");
            }
        } finally {
            setSaving(false);
        }
    };

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

    return (
        <div className="p-8 max-w-4xl mx-auto text-gray-900">
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
                    <option value="none">No class assigned</option>
                    {classes.map((c) => (
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
                            <th className="p-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filtered.map((s) => (
                            <tr key={s.id}>
                                <td className="p-3">{s.fullName}</td>
                                <td className="p-3 text-gray-500">{s.regNumber}</td>
                                <td className="p-3 text-gray-500">
                                    {s.className ?? <span className="text-red-500">No class</span>}
                                </td>
                                <td className="p-3 text-right space-x-4">
                                    <button
                                        onClick={() => openEdit(s)}
                                        className="text-blue-600 hover:underline text-sm"
                                    >
                                        Edit
                                    </button>
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

            {editing && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h2 className="text-lg font-semibold mb-4">Edit Student</h2>

                        <label className="block text-sm font-medium mb-1">Full Name</label>
                        <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full border rounded px-3 py-2 mb-3 bg-white text-gray-900"
                        />

                        <label className="block text-sm font-medium mb-1">Registration Number</label>
                        <input
                            value={editReg}
                            onChange={(e) => setEditReg(e.target.value)}
                            className="w-full border rounded px-3 py-2 mb-3 bg-white text-gray-900"
                        />

                        <label className="block text-sm font-medium mb-1">Class</label>
                        <select
                            value={editClassId}
                            onChange={(e) => setEditClassId(e.target.value)}
                            className="w-full border rounded px-3 py-2 mb-3 bg-white text-gray-900"
                        >
                            {!editing.classId && <option value="">No class assigned</option>}
                            {classes.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>

                        <label className="block text-sm font-medium mb-1">New Password</label>
                        <input
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            placeholder="Leave blank to keep the current password"
                            className="w-full border rounded px-3 py-2 mb-4 bg-white text-gray-900"
                        />

                        {editError && <p className="text-sm text-red-600 mb-3">{editError}</p>}

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setEditing(null)}
                                className="px-4 py-2 text-sm text-gray-600 hover:underline"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveEdit}
                                disabled={saving}
                                className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                            >
                                {saving ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}



// "use client";

// import { useEffect, useState } from "react";
// import { DashboardHeader } from "@/app/components/DashboardHeader";

// type Student = { id: string; fullName: string; regNumber: string | null; className: string; classId: string };
// type ClassOption = { id: string; name: string };

// export default function ManageStudentsPage() {
//     const [students, setStudents] = useState<Student[]>([]);
//     const [classFilter, setClassFilter] = useState("all");
//     const [message, setMessage] = useState("");

//     useEffect(() => {
//         fetch("/api/admin/all-students")
//             .then((res) => res.json())
//             .then((data) => setStudents(Array.isArray(data) ? data : []));
//     }, []);

//     const classOptions: ClassOption[] = Array.from(
//         new Map(students.map((s) => [s.classId, { id: s.classId, name: s.className }])).values()
//     );

//     const deleteStudent = async (id: string, name: string) => {
//         if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
//         const res = await fetch(`/api/admin/students/${id}`, { method: "DELETE" });
//         const data = await res.json();
//         if (res.ok) {
//             setMessage(data.message);
//             setStudents((prev) => prev.filter((s) => s.id !== id));
//         } else {
//             setMessage(`Error: ${data.error}`);
//         }
//     };

//     const filtered =
//         classFilter === "all" ? students : students.filter((s) => s.classId === classFilter);

//     return (
//         <div className="p-8 max-w-3xl mx-auto text-gray-900">
//             <DashboardHeader title="All Students" />

//             {message && (
//                 <p className="text-sm bg-blue-50 border border-blue-200 text-blue-700 rounded-lg px-4 py-2 mb-4">
//                     {message}
//                 </p>
//             )}

//             <div className="flex items-center justify-between mb-4">
//                 <p className="text-sm text-gray-500">{filtered.length} student(s)</p>
//                 <select
//                     value={classFilter}
//                     onChange={(e) => setClassFilter(e.target.value)}
//                     className="border rounded px-3 py-2 bg-white text-sm"
//                 >
//                     <option value="all">All Classes</option>
//                     {classOptions.map((c) => (
//                         <option key={c.id} value={c.id}>
//                             {c.name}
//                         </option>
//                     ))}
//                 </select>
//             </div>

//             <div className="bg-white rounded-lg shadow overflow-hidden">
//                 <table className="w-full text-sm">
//                     <thead className="bg-gray-50 border-b">
//                         <tr>
//                             <th className="text-left p-3">Name</th>
//                             <th className="text-left p-3">Reg. Number</th>
//                             <th className="text-left p-3">Class</th>
//                             <th className="text-left p-3"></th>
//                         </tr>
//                     </thead>
//                     <tbody className="divide-y">
//                         {filtered.map((s) => (
//                             <tr key={s.id}>
//                                 <td className="p-3">{s.fullName}</td>
//                                 <td className="p-3 text-gray-500">{s.regNumber}</td>
//                                 <td className="p-3 text-gray-500">{s.className}</td>
//                                 <td className="p-3">
//                                     <button
//                                         onClick={() => deleteStudent(s.id, s.fullName)}
//                                         className="text-red-600 hover:underline text-sm"
//                                     >
//                                         Delete
//                                     </button>
//                                 </td>
//                             </tr>
//                         ))}
//                     </tbody>
//                 </table>
//             </div>
//         </div>
//     );
// }
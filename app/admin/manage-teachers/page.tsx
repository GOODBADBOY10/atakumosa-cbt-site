"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/app/components/DashboardHeader";

type Pair = { subjectId: string; classId: string };
type Teacher = {
  id: string;
  fullName: string;
  email: string;
  assignments: string[];
  assignmentPairs: Pair[];
};
type Option = { id: string; name: string };

const keyOf = (p: Pair) => `${p.subjectId}:${p.classId}`;

export default function ManageTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [classes, setClasses] = useState<Option[]>([]);
  const [message, setMessage] = useState("");

  const [editing, setEditing] = useState<Teacher | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editPairs, setEditPairs] = useState<Pair[]>([]);
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch("/api/admin/teachers")
      .then((res) => res.json())
      .then((data) => setTeachers(Array.isArray(data) ? data : []));
  };

  useEffect(() => {
    load();
    fetch("/api/admin/subjects").then((r) => r.json()).then((d) => setSubjects(Array.isArray(d) ? d : []));
    fetch("/api/admin/classes").then((r) => r.json()).then((d) => setClasses(Array.isArray(d) ? d : []));
  }, []);

  const openEdit = (t: Teacher) => {
    setEditing(t);
    setEditName(t.fullName);
    setEditEmail(t.email);
    setEditPassword("");
    setEditPairs(t.assignmentPairs ?? []);
    setEditError("");
  };

  const togglePair = (subjectId: string, classId: string) => {
    const k = `${subjectId}:${classId}`;
    setEditPairs((prev) =>
      prev.some((p) => keyOf(p) === k)
        ? prev.filter((p) => keyOf(p) !== k)
        : [...prev, { subjectId, classId }]
    );
  };

  const saveEdit = async () => {
    if (!editing || saving) return;

    const body: Record<string, unknown> = {};
    if (editName.trim() !== editing.fullName) body.fullName = editName.trim();
    if (editEmail.trim().toLowerCase() !== editing.email.toLowerCase()) body.email = editEmail.trim();
    if (editPassword) body.password = editPassword;

    const before = (editing.assignmentPairs ?? []).map(keyOf).sort().join("|");
    const after = editPairs.map(keyOf).sort().join("|");
    if (before !== after) body.assignments = editPairs;

    if (Object.keys(body).length === 0) {
      setEditError("No changes made");
      return;
    }

    setSaving(true);
    setEditError("");
    try {
      const res = await fetch(`/api/admin/teachers/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`${editName.trim()} updated successfully`);
        setEditing(null);
        load();
      } else {
        setEditError(data.error || "Could not save changes");
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteTeacher = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/teachers/${id}`, { method: "DELETE" });
    const data = await res.json();
    setMessage(res.ok ? data.message : `Error: ${data.error}`);
    if (res.ok) load();
  };

  return (
    <div className="p-8 max-w-4xl mx-auto text-gray-900">
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
              <th className="p-3"></th>
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
                <td className="p-3 text-right space-x-4 whitespace-nowrap">
                  <button onClick={() => openEdit(t)} className="text-blue-600 hover:underline text-sm">
                    Edit
                  </button>
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

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Edit Teacher</h2>

            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-3 bg-white text-gray-900"
            />

            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-3 bg-white text-gray-900"
            />

            <label className="block text-sm font-medium mb-1">New Password</label>
            <input
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              placeholder="Leave blank to keep the current password"
              className="w-full border rounded px-3 py-2 mb-4 bg-white text-gray-900"
            />

            <p className="text-sm font-medium mb-2">Subjects and classes</p>
            <div className="border rounded p-3 mb-4 max-h-64 overflow-y-auto">
              {subjects.map((subject) => (
                <div key={subject.id} className="mb-3">
                  <p className="font-medium text-sm mb-1">{subject.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {classes.map((cls) => {
                      const selected = editPairs.some((p) => keyOf(p) === `${subject.id}:${cls.id}`);
                      return (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => togglePair(subject.id, cls.id)}
                          className={`px-3 py-1 rounded-full text-sm border ${
                            selected
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
              ))}
            </div>

            {editError && <p className="text-sm text-red-600 mb-3">{editError}</p>}

            <div className="flex justify-end gap-3">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm text-gray-600 hover:underline">
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

// type Teacher = {
//     id: string;
//     fullName: string;
//     email: string;
//     assignments: string[];
// };

// export default function ManageTeachersPage() {
//     const [teachers, setTeachers] = useState<Teacher[]>([]);
//     const [message, setMessage] = useState("");

//     const load = () => {
//         fetch("/api/admin/teachers")
//             .then((res) => res.json())
//             .then((data) => setTeachers(Array.isArray(data) ? data : []));
//     };

//     useEffect(() => {
//         load();
//     }, []);

//     const deleteTeacher = async (id: string, name: string) => {
//         if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
//         const res = await fetch(`/api/admin/teachers/${id}`, { method: "DELETE" });
//         const data = await res.json();
//         if (res.ok) {
//             setMessage(data.message);
//             load();
//         } else {
//             setMessage(`Error: ${data.error}`);
//         }
//     };

//     return (
//         <div className="p-8 max-w-3xl mx-auto text-gray-900">
//             <DashboardHeader title="Manage Teachers" />

//             {message && (
//                 <p className="text-sm bg-blue-50 border border-blue-200 text-blue-700 rounded-lg px-4 py-2 mb-4">
//                     {message}
//                 </p>
//             )}

//             <div className="bg-white rounded-lg shadow overflow-hidden">
//                 <table className="w-full text-sm">
//                     <thead className="bg-gray-50 border-b">
//                         <tr>
//                             <th className="text-left p-3">Name</th>
//                             <th className="text-left p-3">Email</th>
//                             <th className="text-left p-3">Assigned to</th>
//                             <th className="text-left p-3"></th>
//                         </tr>
//                     </thead>
//                     <tbody className="divide-y">
//                         {teachers.map((t) => (
//                             <tr key={t.id}>
//                                 <td className="p-3">{t.fullName}</td>
//                                 <td className="p-3 text-gray-500">{t.email}</td>
//                                 <td className="p-3 text-gray-500 text-xs">
//                                     {t.assignments.length > 0 ? t.assignments.join(", ") : "None"}
//                                 </td>
//                                 <td className="p-3">
//                                     <button
//                                         onClick={() => deleteTeacher(t.id, t.fullName)}
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
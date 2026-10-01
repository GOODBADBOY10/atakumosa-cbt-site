"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/app/components/DashboardHeader";
import { Eye, EyeOff } from "lucide-react";

type Admin = { id: string; fullName: string; email: string; createdAt: string };

export default function ManageAdminsPage() {
    const [admins, setAdmins] = useState<Admin[]>([]);
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState("");

    const load = () => {
        fetch("/api/admin/admins")
            .then((res) => res.json())
            .then((data) => setAdmins(Array.isArray(data) ? data : []));
    };

    useEffect(() => {
        load();
    }, []);

    const createAdmin = async () => {
        setMessage("");
        const res = await fetch("/api/admin/admins", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fullName, email, password }),
        });
        const data = await res.json();
        if (res.ok) {
            setMessage(`Admin "${fullName}" created successfully`);
            setFullName("");
            setEmail("");
            setPassword("");
            load();
        } else {
            setMessage(`Error: ${data.error}`);
        }
    };

    const deleteAdmin = async (id: string, name: string) => {
        if (!confirm(`Remove ${name} as an admin? This cannot be undone.`)) return;
        const res = await fetch(`/api/admin/admins/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (res.ok) {
            setMessage(data.message);
            load();
        } else {
            setMessage(`Error: ${data.error}`);
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto text-gray-900">
            <DashboardHeader title="Manage Admins" />

            {message && (
                <p className="text-sm bg-blue-50 border border-blue-200 text-blue-700 rounded-lg px-4 py-2 mb-4">
                    {message}
                </p>
            )}

            <section className="bg-white p-6 rounded-lg shadow mb-6">
                <h2 className="text-lg font-semibold mb-4">Add New Admin</h2>
                <div className="space-y-3">
                    <input
                        placeholder="Full Name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full border rounded px-3 py-2 bg-white"
                    />
                    <input
                        placeholder="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full border rounded px-3 py-2 bg-white"
                    />
                    <div className="relative">
                        <input
                            placeholder="Temporary Password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border rounded px-3 py-2 pr-10 bg-white"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((p) => !p)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    <button
                        onClick={createAdmin}
                        className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
                    >
                        Create Admin
                    </button>
                </div>
            </section>

            <section className="bg-white rounded-lg shadow overflow-hidden">
                <h2 className="text-lg font-semibold p-6 pb-2">Current Admins</h2>
                <table className="w-full text-sm">
                    <tbody className="divide-y">
                        {admins.map((a) => (
                            <tr key={a.id}>
                                <td className="p-4">
                                    <p className="font-medium">{a.fullName}</p>
                                    <p className="text-gray-500 text-xs">{a.email}</p>
                                </td>
                                <td className="p-4 text-right">
                                    <button
                                        onClick={() => deleteAdmin(a.id, a.fullName)}
                                        className="text-red-600 hover:underline text-sm"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </div>
    );
}
"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/app/components/DashboardHeader";

type LockedUser = {
    id: string;
    fullName: string;
    email: string;
    regNumber: string | null;
    role: string;
    failedLoginAttempts: number;
};

export default function LockedAccountsPage() {
    const [users, setUsers] = useState<LockedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");

    const loadLocked = () => {
        fetch("/api/admin/locked-accounts")
            .then((res) => res.json())
            .then((data) => {
                setUsers(Array.isArray(data) ? data : []);
                setLoading(false);
            });
    };

    useEffect(() => {
        loadLocked();
    }, []);

    const unlock = async (id: string) => {
        const res = await fetch(`/api/admin/locked-accounts/${id}/unlock`, {
            method: "POST",
        });
        const data = await res.json();
        if (res.ok) {
            setMessage(data.message);
            loadLocked();
        } else {
            setMessage(data.error);
        }
    };

    return (
        <div className="p-8 max-w-3xl mx-auto text-gray-900">
            <DashboardHeader title="Locked Accounts" />

            <p className="text-sm text-gray-500 mb-4">
                These accounts were automatically locked after 3 failed login attempts.
                Confirm the person's identity before unlocking.
            </p>

            {message && (
                <p className="text-sm bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-2 mb-4">
                    {message}
                </p>
            )}

            {loading ? (
                <p>Loading...</p>
            ) : users.length === 0 ? (
                <p className="text-gray-500">No locked accounts right now.</p>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-left p-3">Name</th>
                                <th className="text-left p-3">Role</th>
                                <th className="text-left p-3">Email / Reg No.</th>
                                <th className="text-left p-3">Failed Attempts</th>
                                <th className="text-left p-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {users.map((u) => (
                                <tr key={u.id}>
                                    <td className="p-3">{u.fullName}</td>
                                    <td className="p-3 capitalize">{u.role}</td>
                                    <td className="p-3 text-gray-500">{u.regNumber || u.email}</td>
                                    <td className="p-3 text-red-600 font-medium">{u.failedLoginAttempts}</td>
                                    <td className="p-3">
                                        <button
                                            onClick={() => unlock(u.id)}
                                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                                        >
                                            Unlock
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
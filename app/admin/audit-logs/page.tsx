"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/app/components/DashboardHeader";

type LogEntry = {
    id: string;
    userName: string | null;
    userRole: string | null;
    action: string;
    details: Record<string, unknown> | null;
    createdAt: string;
};

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/admin/audit-logs")
            .then((res) => res.json())
            .then((data) => {
                setLogs(Array.isArray(data) ? data : []);
                setLoading(false);
            });
    }, []);

    return (
        <div className="p-8 max-w-4xl mx-auto text-gray-900">
            <DashboardHeader title="Audit Log" />

            {loading ? (
                <p>Loading...</p>
            ) : logs.length === 0 ? (
                <p className="text-gray-500">No activity logged yet.</p>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-left p-3">Time</th>
                                <th className="text-left p-3">User</th>
                                <th className="text-left p-3">Role</th>
                                <th className="text-left p-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {logs.map((log) => (
                                <tr key={log.id}>
                                    <td className="p-3 text-gray-500">
                                        {new Date(log.createdAt).toLocaleString()}
                                    </td>
                                    <td className="p-3">{log.userName || "Unknown"}</td>
                                    <td className="p-3 capitalize">{log.userRole}</td>
                                    <td className="p-3">{log.action.replace(/_/g, " ")}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
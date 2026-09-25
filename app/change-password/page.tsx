"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";

export default function ChangePasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { update } = useSession();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });
    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      await signOut({ redirect: false });
      window.location.href = "/login?passwordChanged=true";
  } else {
    setError(data.error);
}
  };

return (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
      <h1 className="text-2xl font-semibold mb-2 text-center text-gray-900">
        Set a New Password
      </h1>
      <p className="text-sm text-gray-500 mb-6 text-center">
        For security, please set a new password before continuing.
      </p>

      <label className="block text-sm font-medium mb-1 text-gray-700">New Password</label>
      <input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        className="w-full border rounded px-3 py-2 mb-4 text-gray-900 bg-white"
        required
      />

      <label className="block text-sm font-medium mb-1 text-gray-700">Confirm Password</label>
      <input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        className="w-full border rounded px-3 py-2 mb-4 text-gray-900 bg-white"
        required
      />

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Saving..." : "Set Password"}
      </button>
    </form>
  </div>
);
}
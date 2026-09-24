"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      identifier,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      if (res.error.includes("Too many")) {
        setError("Too many login attempts. Please wait a minute and try again.");
      } else {
        setError("Invalid email/reg number or password");
      }
      return;
    }

    // Fetch session to know where to redirect based on role
    const sessionRes = await fetch("/api/auth/session");
    const session = await sessionRes.json();
    const role = session?.user?.role;

    if (role === "admin") router.push("/admin");
    else if (role === "teacher") router.push("/teacher");
    else if (role === "student") router.push("/student");
    else router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm"
      >
        <h1 className="text-2xl font-semibold mb-6 text-center text-gray-900">
          CBT Platform Login
        </h1>

        <label className="block text-sm font-medium mb-1 text-gray-700">
          Email or Registration Number
        </label>

        <input
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-4 text-gray-900 bg-white placeholder-gray-400"
          required
        />

        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-4 text-gray-900 bg-white placeholder-gray-400"
          required
        />

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className={`w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 ${loading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { HeroSlideshow } from "@/app/components/HeroSlideshow";

const loginImages = [
  "/images/slider-1.jpg",
  "/images/gallery-8.jpg",
  "/images/gallery-9.jpg",
  "/images/gallery-10.jpg",
  "/images/gallery-12.jpg",
  "/images/gallery-13.jpg",
  "/images/gallery-14.jpg",
  "/images/gallery-15.jpg",
  "/images/gallery-16.jpg",
  "/images/gallery-17.jpg",
];

function LoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const passwordChanged = searchParams.get("passwordChanged") === "true";

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
      } else if (res.error.includes("ACCOUNT_LOCKED")) {
        setError("Your account has been locked after 3 failed attempts. Please see your school administrator to reset it.");
      } else {
        setError("Invalid email/reg number or password");
      }
      return;
    }

    const sessionRes = await fetch("/api/auth/session");
    const session = await sessionRes.json();
    const role = session?.user?.role;

    if (role === "admin") router.push("/admin");
    else if (role === "teacher") router.push("/teacher");
    else if (role === "student") router.push("/student");
    else router.push("/");
  };

  return (
    <div className="relative z-10 w-full max-w-md px-4 py-20">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white drop-shadow-sm tracking-tight">
          Atakunmosa CBT Platform
        </h1>
        <p className="text-white/80 mt-2 text-sm">
          Computer-based testing for students, teachers &amp; administrators
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-2xl w-full"
      >
        <h2 className="text-xl font-semibold mb-6 text-center text-gray-900">
          Sign In
        </h2>

        {passwordChanged && (
          <p className="text-center text-green-700 bg-green-50 border border-green-200 rounded-lg py-2 px-4 mb-4 text-sm">
            Password changed successfully. Please log in again.
          </p>
        )}

        <label className="block text-sm font-medium mb-1 text-gray-700">
          Email or Registration Number
        </label>
        <input
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 mb-4 text-gray-900 bg-white border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />

        <label className="block text-sm font-medium mb-1 text-gray-700">
          Password
        </label>
        <div className="relative mb-4">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 pr-10 text-gray-900 bg-white border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <p className="text-center text-white/70 text-xs mt-6">
        Having trouble logging in? Contact your school administrator.
      </p>

      <div className="text-center mt-4">
        <a href="/" className="text-white/70 text-xs hover:text-white hover:underline">
          ← Back to school website
        </a>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <HeroSlideshow images={loginImages} interval={4000}>
      <div className="min-h-screen flex items-center justify-center">
        <Suspense fallback={<div className="relative z-10 text-white">Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </HeroSlideshow>
  );
}
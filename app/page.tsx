import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HomePage() {
  const session = await auth();

  if (session?.user?.role === "admin") redirect("/admin");
  if (session?.user?.role === "teacher") redirect("/teacher");
  if (session?.user?.role === "student") redirect("/student");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          School CBT Platform
        </h1>
        <p className="text-gray-600 mb-8">
          Computer-based testing for students, teachers, and admin.
        </p>
        <Link
          href="/login"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}
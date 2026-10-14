import { auth } from "@/auth";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/", "/login"];
const SUPER_ADMIN_ONLY = ["/admin/manage-admins", "/admin/oversight"];

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role;
  const mustChange = req.auth?.user?.mustChangePassword;
  const isAdminLevel = role === "admin" || role === "super_admin";

  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  if (!req.auth && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (req.auth && mustChange && pathname !== "/change-password") {
    return NextResponse.redirect(new URL("/change-password", req.url));
  }

  if (pathname.startsWith("/admin") && !isAdminLevel) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (SUPER_ADMIN_ONLY.some((p) => pathname.startsWith(p)) && role !== "super_admin") {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  // if (pathname.startsWith("/teacher") && role !== "teacher") {
  if (pathname.startsWith("/teacher") && role !== "teacher" && role !== "super_admin") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname.startsWith("/student") && role !== "student") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/", "/admin/:path*", "/teacher/:path*", "/student/:path*", "/change-password"],
};
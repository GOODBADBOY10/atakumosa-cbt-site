import { auth } from "@/auth";
import { NextResponse } from "next/server";

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role;
  const mustChange = req.auth?.user?.mustChangePassword;

  if (!req.auth && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (req.auth && mustChange && pathname !== "/change-password") {
    return NextResponse.redirect(new URL("/change-password", req.url));
  }

  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname.startsWith("/teacher") && role !== "teacher") {
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
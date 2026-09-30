"use client";

import { useState } from "react";
import Link from "next/link";

export function PublicHeader() {
    const [menuOpen, setMenuOpen] = useState(false);

    const navLinks = [
        { href: "#about", label: "About" },
        { href: "#director", label: "Director" },
        { href: "#gallery", label: "Gallery" },
        { href: "#anthem", label: "Anthem" },
        { href: "#contact", label: "Contact" },
    ];

    return (
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b shadow-sm">
            <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/images/logo.jpg"
                        alt="Atakumosa High School Logo"
                        className="w-9 h-9 rounded-full object-cover"
                    />
                    <span className="font-semibold text-gray-900 text-sm sm:text-base">
                        Atakumosa High School
                    </span>
                </Link>

                {/* Desktop nav */}
                <nav className="hidden sm:flex items-center gap-6">
                    {navLinks.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            className="text-sm text-gray-600 hover:text-blue-700"
                        >
                            {link.label}
                        </a>
                    ))}
                    <Link
                        href="/login"
                        className="bg-blue-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors"
                    >
                        Login
                    </Link>
                </nav>

                {/* Mobile menu toggle */}
                <button
                    className="sm:hidden text-gray-700"
                    onClick={() => setMenuOpen((prev) => !prev)}
                    aria-label="Toggle menu"
                >
                    {menuOpen ? "✕" : "☰"}
                </button>
            </div>

            {/* Mobile nav */}
            {menuOpen && (
                <nav className="sm:hidden border-t bg-white px-6 py-4 flex flex-col gap-3">
                    {navLinks.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            onClick={() => setMenuOpen(false)}
                            className="text-sm text-gray-600 hover:text-blue-700"
                        >
                            {link.label}
                        </a>
                    ))}
                    <Link
                        href="/login"
                        className="bg-blue-700 text-white text-sm px-4 py-2 rounded-lg text-center hover:bg-blue-800 transition-colors"
                    >
                        Login
                    </Link>
                </nav>
            )}
        </header>
    );
}
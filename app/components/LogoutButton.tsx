"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
    return (
        <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm text-red-600 hover:text-red-800 font-medium"
        >
            Log Out
        </button>
    );
}
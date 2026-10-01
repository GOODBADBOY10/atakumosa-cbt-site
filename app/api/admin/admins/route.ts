import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { logAction } from "@/lib/audit";

const adminSchema = z.object({
    fullName: z.string().trim().min(2).max(100),
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function GET() {
    const session = await auth();
    if (session?.user?.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const admins = await db
            .select({ id: users.id, fullName: users.fullName, email: users.email, createdAt: users.createdAt })
            .from(users)
            .where(eq(users.role, "admin"));

        return NextResponse.json(admins);
    } catch (err) {
        console.error("Failed to fetch admins:", err);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (session?.user?.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    let body;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = adminSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    try {
        const existing = await db.select().from(users).where(eq(users.email, parsed.data.email));
        if (existing.length > 0) {
            return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
        }

        const passwordHash = await bcrypt.hash(parsed.data.password, 10);

        const [newAdmin] = await db
            .insert(users)
            .values({
                fullName: parsed.data.fullName,
                email: parsed.data.email,
                passwordHash,
                role: "admin",
                mustChangePassword: true,
            })
            .returning({ id: users.id, fullName: users.fullName, email: users.email });

        await logAction(session.user.id, "admin", "created_admin", {
            newAdminId: newAdmin.id,
            newAdminEmail: newAdmin.email,
        });

        return NextResponse.json(newAdmin);
    } catch (err) {
        console.error("Failed to create admin:", err);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
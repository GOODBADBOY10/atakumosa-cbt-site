import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { subjects } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { z } from "zod";

const subjectSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
});

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const allSubjects = await db.select().from(subjects);
    return NextResponse.json(allSubjects);
  } catch (err) {
    console.error("Failed to fetch subjects:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
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

  const parsed = subjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  try {
    // Case-insensitive check, so "economics" and "ECONOMICS" count as the same subject
    const existing = await db
      .select()
      .from(subjects)
      .where(sql`lower(${subjects.name}) = ${parsed.data.name.toLowerCase()}`);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "A subject with this name already exists" },
        { status: 409 }
      );
    }

    const [newSubject] = await db
      .insert(subjects)
      .values({ name: parsed.data.name })
      .returning();

    return NextResponse.json(newSubject);
  } catch (err) {
    // Two requests arriving at the same instant (a double-click) can both pass the
    // check above. The database's unique rule rejects the second one (code 23505).
    const e = err as { code?: string; cause?: { code?: string } };
    if ((e.code ?? e.cause?.code) === "23505") {
      return NextResponse.json(
        { error: "A subject with this name already exists" },
        { status: 409 }
      );
    }

    console.error("Failed to create subject:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
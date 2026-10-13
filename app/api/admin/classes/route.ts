import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { classes } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

const classSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(50),
});

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const allClasses = await db.select().from(classes);
    return NextResponse.json(allClasses);
  } catch (err) {
    console.error("Failed to fetch classes:", err);
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

  const parsed = classSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  try {
    // const existing = await db
    //   .select()
    //   .from(classes)
    //   .where(eq(classes.name, parsed.data.name));

    const existing = await db
      .select()
      .from(classes)
      .where(sql`lower(${classes.name}) = ${parsed.data.name.toLowerCase()}`);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "A class with this name already exists" },
        { status: 409 }
      );
    }

    const [newClass] = await db
      .insert(classes)
      .values({ name: parsed.data.name })
      .returning();

    return NextResponse.json(newClass);
  } catch (err) {
    const e = err as { code?: string; cause?: { code?: string } };
    if ((e.code ?? e.cause?.code) === "23505") {
      return NextResponse.json(
        { error: "A class with this name already exists" },
        { status: 409 }
      );
    }
    console.error("Failed to create class:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
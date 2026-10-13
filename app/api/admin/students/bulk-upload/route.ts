import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users, studentClasses, classes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { logAction } from "@/lib/audit";

const rowSchema = z.object({
  FullName: z.string().trim().min(2),
  RegNumber: z.string().trim().min(2),
  ClassName: z.string().trim().min(1),
  Password: z.string().trim().min(2, "Password (student's surname) is required"),
});

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  let rows: Record<string, unknown>[];
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
  } catch (err) {
    console.error("Failed to parse file:", err);
    return NextResponse.json(
      { error: "Could not read the uploaded file. Make sure it's a valid Excel/CSV file." },
      { status: 400 }
    );
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "The file has no data rows" }, { status: 400 });
  }

  // Get all classes upfront to map names -> IDs
  const allClasses = await db.select().from(classes);
  const classMap = new Map(allClasses.map((c) => [c.name.toLowerCase().trim(), c.id]));

  // Validate every row before inserting anything
  const validRows: { fullName: string; regNumber: string; classId: string; password: string }[] = [];
  const errors: string[] = [];
  const seenRegNumbers = new Set<string>();

  rows.forEach((row, index) => {
    const parsed = rowSchema.safeParse(row);
    if (!parsed.success) {
      errors.push(`Row ${index + 2}: ${parsed.error.issues[0].message}`);
      return;
    }

    const data = parsed.data;
    const classId = classMap.get(data.ClassName.toLowerCase().trim());

    if (!classId) {
      errors.push(`Row ${index + 2}: Class "${data.ClassName}" does not exist. Create it first.`);
      return;
    }

    if (seenRegNumbers.has(data.RegNumber.toLowerCase())) {
      errors.push(`Row ${index + 2}: Duplicate registration number "${data.RegNumber}" within this file`);
      return;
    }
    seenRegNumbers.add(data.RegNumber.toLowerCase());

    validRows.push({
      fullName: data.FullName,
      regNumber: data.RegNumber,
      classId,
      password: data.Password,
    });
  });

  if (errors.length > 0) {
    return NextResponse.json(
      {
        error: "Some rows had errors. Fix them and re-upload.",
        details: errors,
        validCount: validRows.length,
        errorCount: errors.length,
      },
      { status: 400 }
    );
  }

  // Check for existing reg numbers already in the database
  const existingUsers = await db.select({ regNumber: users.regNumber }).from(users);
  const existingRegNumbers = new Set(
    existingUsers.map((u) => u.regNumber?.toLowerCase()).filter(Boolean)
  );

  const duplicatesInDb = validRows.filter((r) =>
    existingRegNumbers.has(r.regNumber.toLowerCase())
  );

  if (duplicatesInDb.length > 0) {
    return NextResponse.json(
      {
        error: "Some registration numbers already exist in the system",
        details: duplicatesInDb.map((r) => `${r.regNumber} (${r.fullName})`),
      },
      { status: 409 }
    );
  }

  try {
    // Hash first (the slow part), outside the database transaction
    const prepared: {
      fullName: string;
      regNumber: string;
      classId: string;
      password: string;
      passwordHash: string;
    }[] = [];
    for (const row of validRows) {
      prepared.push({ ...row, passwordHash: await bcrypt.hash(row.password, 10) });
    }

    // Save every student and class link together: all succeed, or none do
    await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(users)
        .values(
          prepared.map((r) => ({
            email: `${r.regNumber}@student.local`,
            fullName: r.fullName,
            regNumber: r.regNumber,
            passwordHash: r.passwordHash,
            role: "student" as const,
            mustChangePassword: false,
          }))
        )
        .returning({ id: users.id, regNumber: users.regNumber });

      const idByReg = new Map(inserted.map((u) => [u.regNumber, u.id]));

      await tx.insert(studentClasses).values(
        prepared.map((r) => {
          const studentId = idByReg.get(r.regNumber);
          if (!studentId) throw new Error(`Missing ID for ${r.regNumber}`);
          return { studentId, classId: r.classId };
        })
      );
    });

    await logAction(session.user.id, "admin", "bulk_created_students", {
      count: prepared.length,
    });

    return NextResponse.json({
      message: `${prepared.length} students created successfully`,
      count: prepared.length,
    });
  } catch (err) {
    console.error("Failed to bulk create students:", err);
    return NextResponse.json(
      { error: "Something went wrong while saving. Nothing was saved. Please try again." },
      { status: 500 }
    );
  }
}
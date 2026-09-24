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
  Password: z.string().min(6).optional(),
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
      password: data.Password || data.RegNumber, // default temp password = their own reg number if not provided
      // password: data.Password || "student123", // default temp password if not provided
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
    let createdCount = 0;

    for (const row of validRows) {
      const passwordHash = await bcrypt.hash(row.password, 10);

      const [newStudent] = await db
        .insert(users)
        .values({
          email: `${row.regNumber}@student.local`,
          fullName: row.fullName,
          regNumber: row.regNumber,
          passwordHash,
          role: "student",
        })
        .returning({ id: users.id });

      await db.insert(studentClasses).values({
        studentId: newStudent.id,
        classId: row.classId,
      });

      createdCount++;
    }

    await logAction(session.user.id, "admin", "bulk_created_students", {
      count: createdCount,
    });

    return NextResponse.json({
      message: `${createdCount} students created successfully`,
      count: createdCount,
    });
  } catch (err) {
    console.error("Failed to bulk create students:", err);
    return NextResponse.json(
      { error: "Something went wrong while saving. Please try again." },
      { status: 500 }
    );
  }
}
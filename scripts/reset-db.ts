import "dotenv/config";
import { db } from "../lib/db";
import { sql } from "drizzle-orm";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function resetDatabase() {
  console.log("⚠️  WARNING: This will permanently delete ALL data in your database.");
  console.log("This includes: users, teachers, students, subjects, classes, questions, exams, results, everything.");
  console.log("This cannot be undone.\n");

  const answer = await ask('Type "DELETE EVERYTHING" to confirm: ');
  rl.close();

  if (answer !== "DELETE EVERYTHING") {
    console.log("Cancelled. Nothing was deleted.");
    process.exit(0);
  }

  console.log("\nClearing all tables...");

  try {
    // TRUNCATE ... CASCADE clears every table and anything referencing it,
    // in one atomic operation, regardless of foreign key order.
    await db.execute(sql`
      TRUNCATE TABLE
        answers,
        exam_attempts,
        exam_questions,
        exams,
        questions,
        teacher_assignments,
        student_classes,
        audit_logs,
        login_attempts,
        classes,
        subjects,
        users
      RESTART IDENTITY CASCADE
    `);

    console.log("✅ All tables cleared successfully.");
    console.log("\nRun 'npx tsx scripts/seed-admin.ts' next to recreate your admin account.");
  } catch (err) {
    console.error("❌ Failed to reset database:", err);
    process.exit(1);
  }

  process.exit(0);
}

resetDatabase();
import "dotenv/config";
import { db } from "../lib/db";
import { users } from "../lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import readline from "readline";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string) => new Promise<string>((resolve) => rl.question(q, resolve));

async function main() {
  const fullName = (await ask("Full name: ")).trim();
  const email = (await ask("Email: ")).trim().toLowerCase();
  const password = await ask("Password (min 10 characters): ");
  rl.close();

  if (fullName.length < 2 || !email.includes("@")) {
    console.error("Invalid name or email. Aborted.");
    process.exit(1);
  }
  if (password.length < 10) {
    console.error("Password must be at least 10 characters. Aborted.");
    process.exit(1);
  }

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing.length > 0) {
    console.error("A user with that email already exists. Aborted.");
    process.exit(1);
  }

  await db.insert(users).values({
    fullName,
    email,
    passwordHash: await bcrypt.hash(password, 10),
    role: "super_admin",
    mustChangePassword: false,
  });

  console.log(`✅ Super admin created: ${email}`);
  process.exit(0);
}

main();
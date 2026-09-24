import "dotenv/config";
import { db } from "../lib/db";
import { users } from "../lib/db/schema";
import bcrypt from "bcryptjs";

async function seedAdmin() {
  const passwordHash = await bcrypt.hash("changeme123", 10);

  await db.insert(users).values({
    email: "admin@school.com",
    passwordHash,
    fullName: "School Admin",
    role: "admin",
  });

  console.log("Admin created: admin@school.com / changeme123");
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
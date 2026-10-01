import "dotenv/config";
import { db } from "../lib/db";
import { users } from "../lib/db/schema";
import bcrypt from "bcryptjs";

async function seedAdmin() {
  const passwordHash = await bcrypt.hash("schools", 10);

  await db.insert(users).values({
    email: "admin@schools.com",
    passwordHash,
    fullName: "School Admin",
    role: "admin",
  });

  console.log("Admin created: admin@schools.com / schools");
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
import "dotenv/config";
import { db } from "../lib/db";
import { users } from "../lib/db/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import readline from "readline";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function ask(q: string): Promise<string> {
    return new Promise((resolve) => rl.question(q, resolve));
}

async function main() {
    const email = await ask("Admin email to reset: ");
    const newPassword = await ask("New password (min 8 characters): ");
    rl.close();

    if (newPassword.length < 8) {
        console.error("Password must be at least 8 characters. Aborted.");
        process.exit(1);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const [updated] = await db
        .update(users)
        .set({ passwordHash, mustChangePassword: true, isLocked: false, failedLoginAttempts: 0 })
        .where(and(eq(users.email, email.trim().toLowerCase()), eq(users.role, "admin")))
        .returning({ id: users.id, fullName: users.fullName });

    if (!updated) {
        console.error("No admin found with that email.");
        process.exit(1);
    }

    console.log(`✅ Password reset for ${updated.fullName}. They'll be asked to change it on next login.`);
    process.exit(0);
}

main();
import { db } from "@/lib/db";
import { loginAttempts } from "@/lib/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 60;

export async function checkLoginRateLimit(identifier: string): Promise<{ success: boolean }> {
  const normalizedId = identifier.toLowerCase().trim();
  const windowStart = new Date(Date.now() - WINDOW_SECONDS * 1000);

  try {
    const recentAttempts = await db
      .select({ count: sql<number>`count(*)` })
      .from(loginAttempts)
      .where(
        and(
          eq(loginAttempts.identifier, normalizedId),
          gte(loginAttempts.attemptedAt, windowStart)
        )
      );

    const count = Number(recentAttempts[0]?.count || 0);

    if (count >= MAX_ATTEMPTS) {
      return { success: false };
    }

    // Log this attempt
    await db.insert(loginAttempts).values({ identifier: normalizedId });

    return { success: true };
  } catch (err) {
    console.error("Rate limit check failed:", err);
    // Fail open: if the rate limit check itself breaks, don't block real logins
    return { success: true };
  }
}
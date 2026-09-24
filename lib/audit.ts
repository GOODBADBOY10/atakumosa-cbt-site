import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

export async function logAction(
  userId: string,
  userRole: string,
  action: string,
  details?: Record<string, unknown>
) {
  try {
    await db.insert(auditLogs).values({
      userId,
      userRole,
      action,
      details: details || null,
    });
  } catch (err) {
    // Never let audit logging break the actual request
    console.error("Failed to write audit log:", err);
  }
}
import { and, eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "@/db/schema";
import { matches, swipes, users } from "@/db/schema";

type AppDatabase = BetterSQLite3Database<typeof schema>;
type Direction = "like" | "pass";

/** A duplicate request is rejected rather than changing an existing decision. */
export function recordSwipe(database: AppDatabase, swiperId: number, targetId: number, direction: Direction): "not_found" | "self" | "duplicate" | "match" | "recorded" {
  if (swiperId === targetId) return "self";
  if (!database.select({ id: users.id }).from(users).where(eq(users.id, targetId)).get()) return "not_found";
  return database.transaction(tx => {
    const previous = tx.select({ id: swipes.id }).from(swipes)
      .where(and(eq(swipes.swiperId, swiperId), eq(swipes.targetId, targetId))).get();
    if (previous) return "duplicate" as const;

    tx.insert(swipes).values({ swiperId, targetId, direction, createdAt: new Date() }).run();
    if (direction === "pass") return "recorded" as const;

    const reciprocal = tx.select({ id: swipes.id }).from(swipes)
      .where(and(eq(swipes.swiperId, targetId), eq(swipes.targetId, swiperId), eq(swipes.direction, "like"))).get();
    if (!reciprocal) return "recorded" as const;

    // Normalize pair ordering, irrespective of who liked first.
    const userAId = Math.min(swiperId, targetId);
    const userBId = Math.max(swiperId, targetId);
    tx.insert(matches).values({ userAId, userBId, createdAt: new Date() }).onConflictDoNothing().run();
    return "match" as const;
  });
}

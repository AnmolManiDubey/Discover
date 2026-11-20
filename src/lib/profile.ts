import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { interests, userInterests, users } from "@/db/schema";
import type { Profile } from "@/lib/types";

export function getPublicProfiles(ids: number[]): Profile[] {
  if (ids.length === 0) return [];
  const profileRows = db.select().from(users).where(inArray(users.id, ids)).all();
  const interestRows = db.select({ userId: userInterests.userId, name: interests.name })
    .from(userInterests).innerJoin(interests, eq(userInterests.interestId, interests.id))
    .where(inArray(userInterests.userId, ids)).all();
  const interestByUser = new Map<number, string[]>();
  for (const row of interestRows) interestByUser.set(row.userId, [...(interestByUser.get(row.userId) ?? []), row.name]);
  return profileRows.map(row => ({ ...row, interests: interestByUser.get(row.id) ?? [] }));
}

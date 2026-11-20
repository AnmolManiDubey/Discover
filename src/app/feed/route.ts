import { NextResponse } from "next/server";
import { eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { swipes, users } from "@/db/schema";
import { CURRENT_USER_ID } from "@/lib/current-user";
import { getPublicProfiles } from "@/lib/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const seen = new Set(db.select({ targetId: swipes.targetId }).from(swipes)
    .where(eq(swipes.swiperId, CURRENT_USER_ID)).all().map(row => row.targetId));
  const candidates = db.select({ id: users.id }).from(users).where(ne(users.id, CURRENT_USER_ID)).all();
  const ids = candidates.map(row => row.id).filter(id => !seen.has(id));
  return NextResponse.json({ profiles: getPublicProfiles(ids) }, { headers: { "Cache-Control": "no-store" } });
}

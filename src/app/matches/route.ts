import { NextResponse } from "next/server";
import { or, eq } from "drizzle-orm";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { CURRENT_USER_ID } from "@/lib/current-user";
import { getPublicProfiles } from "@/lib/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const rows = db.select().from(matches).where(or(eq(matches.userAId, CURRENT_USER_ID), eq(matches.userBId, CURRENT_USER_ID))).all();
  const ids = rows.map(row => row.userAId === CURRENT_USER_ID ? row.userBId : row.userAId);
  return NextResponse.json({ matches: getPublicProfiles(ids) }, { headers: { "Cache-Control": "no-store" } });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { CURRENT_USER_ID } from "@/lib/current-user";
import { getPublicProfiles } from "@/lib/profile";
import { recordSwipe } from "@/lib/swipe-service";

export const runtime = "nodejs";
const payloadSchema = z.object({ targetId: z.number().int().positive(), direction: z.enum(["like", "pass"]) }).strict();

export async function POST(request: Request) {
  let payload: unknown;
  try { payload = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Invalid swipe payload" }, { status: 400 });

  const { targetId, direction } = parsed.data;
  try {
    const result = recordSwipe(db, CURRENT_USER_ID, targetId, direction);
    if (result === "self") return NextResponse.json({ error: "Cannot swipe yourself" }, { status: 400 });
    if (result === "not_found") return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    if (result === "duplicate") return NextResponse.json({ error: "Profile already swiped" }, { status: 409 });
    const matched = result === "match";
    return NextResponse.json({ matched, ...(matched ? { match: getPublicProfiles([targetId])[0] } : {}) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to process swipe", error);
    return NextResponse.json({ error: "Unable to record swipe" }, { status: 500 });
  }
}

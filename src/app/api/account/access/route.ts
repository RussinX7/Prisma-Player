import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { getAccountAccess } from "@/lib/access/service";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await getAccountAccess(userId), { headers: { "cache-control": "no-store" } });
}

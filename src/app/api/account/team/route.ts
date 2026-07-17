import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

const roles = new Set(["admin", "editor", "analyst", "viewer"]);

async function context(userId: string) {
  const admin = createAdminClient();
  const membership = await admin.from("account_team_members").select("team_id,role,team:account_teams(id,name,owner_id)").eq("user_id", userId).eq("status", "active").order("joined_at").limit(1).maybeSingle();
  if (!membership.data) return { admin, membership: null, seats: 1 };
  const team = Array.isArray(membership.data.team) ? membership.data.team[0] : membership.data.team;
  const subscription = await admin.from("subscriptions").select("plan:billing_plans(team_seats)").eq("user_id", team.owner_id).eq("status", "active").maybeSingle();
  const plan = Array.isArray(subscription.data?.plan) ? subscription.data.plan[0] : subscription.data?.plan;
  return { admin, membership: { ...membership.data, team }, seats: plan?.team_seats ?? 1 };
}

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { admin, membership, seats } = await context(userId);
  if (!membership) return NextResponse.json({ error: "team_not_found" }, { status: 404 });
  const [members, invites] = await Promise.all([
    admin.from("account_team_members").select("id,user_id,role,status,joined_at").eq("team_id", membership.team_id).order("joined_at"),
    admin.from("account_team_invites").select("id,email,role,status,expires_at,created_at").eq("team_id", membership.team_id).eq("status", "pending").order("created_at", { ascending: false }),
  ]);
  const userIds = (members.data ?? []).map((member) => member.user_id);
  const profiles = userIds.length ? await admin.from("profiles").select("id,email,full_name,avatar_url").in("id", userIds) : { data: [] };
  const byId = new Map((profiles.data ?? []).map((profile) => [profile.id, profile]));
  return NextResponse.json({ team: membership.team, currentRole: membership.role, seats, members: (members.data ?? []).map((member) => ({ ...member, profile: byId.get(member.user_id) ?? null })), invites: invites.data ?? [] });
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { admin, membership, seats } = await context(userId);
  if (!membership || !["owner", "admin"].includes(membership.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (seats <= 1) return NextResponse.json({ error: "team_not_in_plan" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const role = String(body.role ?? "viewer");
  if (!/^\S+@\S+\.\S+$/.test(email) || !roles.has(role)) return NextResponse.json({ error: "invalid_invite" }, { status: 400 });
  const [memberCount, inviteCount] = await Promise.all([
    admin.from("account_team_members").select("id", { count: "exact", head: true }).eq("team_id", membership.team_id).eq("status", "active"),
    admin.from("account_team_invites").select("id", { count: "exact", head: true }).eq("team_id", membership.team_id).eq("status", "pending").gt("expires_at", new Date().toISOString()),
  ]);
  if ((memberCount.count ?? 0) + (inviteCount.count ?? 0) >= seats) return NextResponse.json({ error: "seat_limit_reached" }, { status: 409 });

  const profile = await admin.from("profiles").select("id,email").eq("email", email).maybeSingle();
  if (profile.data) {
    const inserted = await admin.from("account_team_members").upsert({ team_id: membership.team_id, user_id: profile.data.id, role, status: "active" }, { onConflict: "team_id,user_id" });
    if (inserted.error) return NextResponse.json({ error: "member_create_failed" }, { status: 500 });
    return NextResponse.json({ joined: true });
  }

  const invite = await admin.from("account_team_invites").upsert({ team_id: membership.team_id, email, role, invited_by: userId, status: "pending", expires_at: new Date(Date.now() + 7 * 86400000).toISOString() }, { onConflict: "team_id,email" }).select("id").single();
  if (invite.error) return NextResponse.json({ error: "invite_create_failed" }, { status: 500 });
  const origin = new URL(request.url).origin;
  const sent = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${origin}/auth/callback?next=/dashboard/settings` });
  if (sent.error) {
    await admin.from("account_team_invites").update({ status: "revoked" }).eq("id", invite.data.id);
    return NextResponse.json({ error: "invite_email_failed" }, { status: 502 });
  }
  return NextResponse.json({ invited: true });
}

export async function PATCH(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { admin, membership } = await context(userId);
  if (!membership || !["owner", "admin"].includes(membership.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const role = String(body.role ?? "");
  if (!roles.has(role)) return NextResponse.json({ error: "invalid_role" }, { status: 400 });
  const target = await admin.from("account_team_members").select("id,role").eq("id", String(body.memberId ?? "")).eq("team_id", membership.team_id).single();
  if (!target.data || target.data.role === "owner") return NextResponse.json({ error: "member_not_editable" }, { status: 400 });
  await admin.from("account_team_members").update({ role }).eq("id", target.data.id);
  return NextResponse.json({ updated: true });
}

export async function DELETE(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { admin, membership } = await context(userId);
  if (!membership || !["owner", "admin"].includes(membership.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  if (body.inviteId) await admin.from("account_team_invites").update({ status: "revoked", updated_at: new Date().toISOString() }).eq("id", body.inviteId).eq("team_id", membership.team_id);
  if (body.memberId) await admin.from("account_team_members").delete().eq("id", body.memberId).eq("team_id", membership.team_id).neq("role", "owner");
  return NextResponse.json({ removed: true });
}

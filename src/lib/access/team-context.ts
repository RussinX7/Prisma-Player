import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type TeamRole = "owner" | "admin" | "editor" | "analyst" | "viewer";

export type TeamAccountContext = {
  actorUserId: string;
  accountOwnerId: string;
  teamId: string | null;
  role: TeamRole;
  canEditContent: boolean;
  canManageAccount: boolean;
};

export async function getTeamAccountContext(userId: string): Promise<TeamAccountContext> {
  const admin = createAdminClient();
  const membership = await admin.from("account_team_members")
    .select("team_id,role")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("joined_at")
    .limit(1)
    .maybeSingle();

  if (!membership.data) return { actorUserId: userId, accountOwnerId: userId, teamId: null, role: "owner", canEditContent: true, canManageAccount: true };
  const team = await admin.from("account_teams").select("owner_id").eq("id", membership.data.team_id).maybeSingle();
  const role = (["owner", "admin", "editor", "analyst", "viewer"].includes(String(membership.data.role)) ? membership.data.role : "viewer") as TeamRole;
  return {
    actorUserId: userId,
    accountOwnerId: team.data?.owner_id ?? userId,
    teamId: membership.data.team_id,
    role,
    canEditContent: ["owner", "admin", "editor"].includes(role),
    canManageAccount: ["owner", "admin"].includes(role),
  };
}

export function forbiddenForRole() {
  return Response.json({ error: "team_role_forbidden", message: "Seu cargo permite visualizar, mas não alterar este recurso." }, { status: 403 });
}

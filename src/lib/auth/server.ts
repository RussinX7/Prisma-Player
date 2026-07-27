import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * Get current user session from Better Auth
 */
export async function getCurrentSession() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session;
  } catch {
    return null;
  }
}

/**
 * Get current user ID from session
 */
export async function getCurrentUserId() {
  const session = await getCurrentSession();
  return session?.user?.id ?? null;
}

/**
 * Require authenticated user, redirect to login if not authenticated
 */
export async function requireUser(next = "/dashboard/videos") {
  const session = await getCurrentSession();
  if (!session?.user) {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  return session.user.id;
}

/**
 * Get current user if they have admin role
 * TODO: Implement role-based access control in Better Auth
 * For now, returns user if authenticated - role check needs to be added
 */
export async function getCurrentAdminUser() {
  const session = await getCurrentSession();
  if (!session?.user) return null;

  // TODO: Check user role from database or session metadata
  // For now, returning user - implement role check based on your schema
  return session.user;
}

/**
 * Require admin user with MFA verification
 * TODO: Implement role-based access and MFA checks
 */
export async function requireAdmin() {
  const session = await getCurrentSession();
  if (!session?.user) {
    redirect(`/login?next=${encodeURIComponent("/admin")}`);
  }

  // TODO: Implement admin role check
  // TODO: Implement MFA verification check
  // For now, just checking if user is authenticated
  
  return session.user;
}

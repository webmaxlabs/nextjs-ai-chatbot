import "server-only";
import type { Session } from "next-auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { AdminUser } from "@/lib/supabase/types";

export type AdminRole = "editor" | "admin" | "super_admin";

export interface AdminSession {
  user: {
    id: string;
    email: string;
  };
  admin: AdminUser;
}

/**
 * Verify if a user has admin access
 * Returns the admin record if found, null otherwise
 * Checks by user_id first, then falls back to email
 */
export async function verifyAdminAccess(
  session: Session | null
): Promise<AdminUser | null> {
  if (!session?.user) {
    return null;
  }

  try {
    // First try to find by user_id
    if (session.user.id) {
      const { data: adminById } = await supabaseAdmin
        .from("admin_users")
        .select("*")
        .eq("user_id", session.user.id)
        .limit(1)
        .maybeSingle();

      if (adminById) {
        return adminById;
      }
    }

    // Fallback: find by email (for cases where user_id is null in admin_users)
    if (session.user.email) {
      const { data: adminByEmail } = await supabaseAdmin
        .from("admin_users")
        .select("*")
        .eq("email", session.user.email)
        .limit(1)
        .maybeSingle();

      if (adminByEmail) {
        return adminByEmail;
      }
    }

    return null;
  } catch (error) {
    console.error("Error verifying admin access:", error);
    return null;
  }
}

/**
 * Check if user has a specific role or higher
 * Role hierarchy: editor < admin < super_admin
 */
export function hasRole(admin: AdminUser, requiredRole: AdminRole): boolean {
  const roleHierarchy: Record<AdminRole, number> = {
    editor: 1,
    admin: 2,
    super_admin: 3,
  };

  const userLevel = roleHierarchy[admin.role as AdminRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole];

  return userLevel >= requiredLevel;
}

/**
 * Require admin access - throws if not admin
 */
export async function requireAdmin(
  session: Session | null
): Promise<AdminUser> {
  const admin = await verifyAdminAccess(session);

  if (!admin) {
    throw new Error("UNAUTHORIZED: Admin access required");
  }

  return admin;
}

/**
 * Require a specific role - throws if insufficient permissions
 */
export async function requireRole(
  session: Session | null,
  role: AdminRole
): Promise<AdminUser> {
  const admin = await requireAdmin(session);

  if (!hasRole(admin, role)) {
    throw new Error(`FORBIDDEN: ${role} role required`);
  }

  return admin;
}

/**
 * Create a new admin user (super_admin only)
 */
export async function createAdminUser(
  userId: string,
  email: string,
  role: AdminRole,
  createdBy: string
): Promise<AdminUser> {
  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .insert({
      user_id: userId,
      email,
      role,
      created_by: createdBy,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating admin user:", error);
    throw new Error("Failed to create admin user");
  }

  return data;
}

/**
 * Update admin user role (super_admin only)
 */
export async function updateAdminRole(
  adminId: string,
  newRole: AdminRole
): Promise<AdminUser> {
  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .update({ role: newRole })
    .eq("id", adminId)
    .select()
    .single();

  if (error) {
    console.error("Error updating admin role:", error);
    throw new Error("Failed to update admin role");
  }

  return data;
}

/**
 * Remove admin user (super_admin only)
 */
export async function removeAdminUser(adminId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("admin_users")
    .delete()
    .eq("id", adminId);

  if (error) {
    console.error("Error removing admin user:", error);
    throw new Error("Failed to remove admin user");
  }
}

/**
 * Log admin action for audit purposes
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  resourceId?: string,
  resourceType?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await supabaseAdmin.from("rag_audit_log").insert({
    event_type: action,
    user_id: adminId,
    user_type: "admin",
    resource_id: resourceId,
    resource_type: resourceType,
    metadata,
  });
}

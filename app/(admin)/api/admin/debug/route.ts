import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * GET /api/admin/debug
 * Debug endpoint to check admin auth status
 * TODO: Remove this in production
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({
        error: "No session",
        session: null,
      });
    }

    // Check what's in admin_users
    const { data: allAdmins } = await supabaseAdmin
      .from("admin_users")
      .select("id, email, role, user_id");

    // Try to find admin by user_id
    const { data: adminById } = await supabaseAdmin
      .from("admin_users")
      .select("*")
      .eq("user_id", session.user?.id || "")
      .single();

    // Try to find admin by email
    const { data: adminByEmail } = await supabaseAdmin
      .from("admin_users")
      .select("*")
      .eq("email", session.user?.email || "")
      .single();

    return NextResponse.json({
      session: {
        userId: session.user?.id,
        email: session.user?.email,
        type: session.user?.type,
        name: session.user?.name,
      },
      adminLookup: {
        byUserId: adminById ? "FOUND" : "NOT FOUND",
        byEmail: adminByEmail ? "FOUND" : "NOT FOUND",
      },
      allAdminsInDb: allAdmins,
    });
  } catch (error) {
    return NextResponse.json({
      error: String(error),
    });
  }
}

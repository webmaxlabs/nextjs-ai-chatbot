import { auth } from "@/app/(auth)/auth";
import { verifyAdminAccess } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

async function getStats() {
  const [documentsResult, collectionsResult, recentActivityResult] =
    await Promise.all([
      supabaseAdmin
        .from("rag_documents")
        .select("*", { count: "exact", head: true })
        .eq("status", "published")
        .eq("chunk_index", 0),
      supabaseAdmin
        .from("rag_collections")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
      supabaseAdmin
        .from("rag_audit_log")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(5),
    ]);

  return {
    documentCount: documentsResult.count || 0,
    collectionCount: collectionsResult.count || 0,
    recentActivity: recentActivityResult.data || [],
  };
}

export default async function AdminDashboard() {
  const session = await auth();
  const admin = await verifyAdminAccess(session);
  const stats = await getStats();

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome back, {admin?.email?.split("@")[0]}
        </h1>
        <p className="text-zinc-400 mt-1">
          Manage your knowledge base and monitor system activity.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
          <div className="text-sm text-zinc-400">Total Documents</div>
          <div className="text-3xl font-bold text-white mt-2">
            {stats.documentCount}
          </div>
          <a
            href="/admin/documents"
            className="text-sm text-blue-400 hover:text-blue-300 mt-4 inline-block"
          >
            View all documents &rarr;
          </a>
        </div>

        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
          <div className="text-sm text-zinc-400">Collections</div>
          <div className="text-3xl font-bold text-white mt-2">
            {stats.collectionCount}
          </div>
          <a
            href="/admin/collections"
            className="text-sm text-blue-400 hover:text-blue-300 mt-4 inline-block"
          >
            Manage collections &rarr;
          </a>
        </div>

        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
          <div className="text-sm text-zinc-400">Quick Actions</div>
          <div className="flex flex-col gap-2 mt-4">
            <a
              href="/admin/documents/upload"
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-center transition-colors"
            >
              Upload Document
            </a>
            <a
              href="/admin/collections/new"
              className="text-sm bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-md text-center transition-colors"
            >
              Create Collection
            </a>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800">
        <div className="px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
        </div>
        <div className="divide-y divide-zinc-800">
          {stats.recentActivity.length === 0 ? (
            <div className="px-6 py-8 text-center text-zinc-500">
              No recent activity
            </div>
          ) : (
            stats.recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="px-6 py-4 flex items-center justify-between"
              >
                <div>
                  <div className="text-sm text-white">
                    {formatEventType(activity.event_type)}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {activity.user_type === "admin" ? "Admin" : "User"} action
                    {activity.resource_type &&
                      ` on ${activity.resource_type}`}
                  </div>
                </div>
                <div className="text-xs text-zinc-500">
                  {formatTimestamp(activity.timestamp)}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="px-6 py-4 border-t border-zinc-800">
          <a
            href="/admin/audit"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            View full audit log &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}

function formatEventType(type: string): string {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

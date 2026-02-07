import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { verifyAdminAccess } from "@/lib/admin/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/admin");
  }

  const admin = await verifyAdminAccess(session);

  if (!admin) {
    redirect("/unauthorized");
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Admin Header */}
      <header className="border-b border-zinc-800 bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <a href="/admin" className="text-xl font-semibold text-white">
                Admin Dashboard
              </a>
              <nav className="hidden md:flex items-center gap-6 ml-8">
                <a
                  href="/admin/documents"
                  className="text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Documents
                </a>
                <a
                  href="/admin/collections"
                  className="text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Collections
                </a>
                <a
                  href="/admin/audit"
                  className="text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Audit Log
                </a>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-400">
                {admin.email} ({admin.role})
              </span>
              <a
                href="/"
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Back to Chat
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

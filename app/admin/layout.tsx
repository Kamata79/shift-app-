import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/app/components/SignOutButton";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: admin } = await supabase
    .from("admin_users")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!admin) redirect("/staff");

  const nav = [
    { href: "/admin", label: "シフトカレンダー" },
    { href: "/admin/staff", label: "職員管理" },
    { href: "/admin/shift-types", label: "勤務パターン・配置基準" },
    { href: "/admin/requests", label: "希望一覧" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-bold text-slate-800">シフト管理（管理者）</span>
            <nav className="hidden md:flex gap-4">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="text-sm text-slate-600 hover:text-blue-600 transition"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500 hidden sm:inline">
              {admin.full_name} さん
            </span>
            <SignOutButton />
          </div>
        </div>
        <nav className="md:hidden flex gap-4 px-4 pb-3 overflow-x-auto">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-sm text-slate-600 hover:text-blue-600 whitespace-nowrap"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

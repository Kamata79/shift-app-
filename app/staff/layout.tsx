import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/app/components/SignOutButton";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staff } = await supabase
    .from("staff")
    .select("role, full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!staff) redirect("/login");
  if (staff.role === "admin") redirect("/admin");

  const nav = [
    { href: "/staff", label: "シフト確認" },
    { href: "/staff/requests", label: "希望を出す" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <span className="font-bold text-slate-800 text-sm">
            {staff.full_name} さんのシフト
          </span>
          <SignOutButton />
        </div>
        <nav className="max-w-lg mx-auto flex gap-4 px-4 pb-3">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-sm text-slate-600 hover:text-blue-600"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="max-w-lg mx-auto px-4 py-5">{children}</main>
    </div>
  );
}

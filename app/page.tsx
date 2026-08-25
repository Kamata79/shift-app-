import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: staff } = await supabase
    .from("staff")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (staff?.role === "admin") redirect("/admin");
  if (staff) redirect("/staff");
  redirect("/login");
}

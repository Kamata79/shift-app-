"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function afterAuth() {
    // 初回ログイン時、事前登録された職員情報とアカウントを紐付ける
    await supabase.rpc("claim_staff_profile");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: staff } = await supabase
      .from("staff")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (staff?.role === "admin") {
      router.push("/admin");
    } else if (staff) {
      router.push("/staff");
    } else {
      setError(
        "このメールアドレスは職員として登録されていません。管理者に確認してください。"
      );
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        await afterAuth();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfo(
          "アカウントを作成しました。確認メールが届いている場合はリンクを開いてから、ログインしてください。"
        );
        setMode("login");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-xl font-bold text-slate-800 mb-1">シフト管理</h1>
        <p className="text-sm text-slate-500 mb-6">
          {mode === "login" ? "ログインしてください" : "はじめてご利用の方はアカウントを作成してください"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">メールアドレス</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">パスワード</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="6文字以上"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {info && (
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2.5 transition"
          >
            {loading ? "処理中..." : mode === "login" ? "ログイン" : "アカウント作成"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
            setInfo(null);
          }}
          className="mt-4 text-sm text-blue-600 hover:underline w-full text-center"
        >
          {mode === "login"
            ? "はじめての方はこちら（アカウント作成）"
            : "すでにアカウントをお持ちの方はこちら"}
        </button>
      </div>
    </div>
  );
}

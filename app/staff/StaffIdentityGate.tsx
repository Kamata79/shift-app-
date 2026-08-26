"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Staff } from "@/lib/types";
import {
  StaffIdentityContext,
  getLocalStaffId,
  setLocalStaffId,
  clearLocalStaffId,
} from "@/lib/staffIdentity";

export default function StaffIdentityGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("staff")
      .select("*")
      .eq("active", true)
      .order("created_at");
    setStaffList(data ?? []);
    const local = getLocalStaffId();
    if (local && (data ?? []).some((s) => s.id === local)) {
      setSelectedId(local);
    } else {
      setSelectedId(null);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  function choose(id: string) {
    setLocalStaffId(id);
    setSelectedId(id);
  }

  function changeName() {
    clearLocalStaffId();
    setSelectedId(null);
  }

  if (loading) {
    return <p className="text-slate-400 text-sm">読み込み中...</p>;
  }

  const current = staffList.find((s) => s.id === selectedId);

  if (!current) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="font-bold text-slate-800">あなたのお名前を選択してください</h1>
          <p className="text-xs text-slate-500 mt-1">
            このアカウントは職員共有のログインです。ご自身の名前を選ぶと、シフト確認・希望提出ができます。
          </p>
        </div>
        {staffList.length === 0 ? (
          <p className="text-sm text-slate-400">
            まだ職員が登録されていません。管理者に確認してください。
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {staffList.map((s) => (
              <button
                key={s.id}
                onClick={() => choose(s.id)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:border-blue-400 hover:bg-blue-50 transition text-left"
              >
                {s.full_name}
                {s.position && (
                  <span className="block text-xs text-slate-400 font-normal mt-0.5">
                    {s.position}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <StaffIdentityContext.Provider value={{ staffId: current.id, staffName: current.full_name }}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-slate-700">{current.full_name} さん</span>
        <button onClick={changeName} className="text-xs text-blue-600 hover:underline">
          名前を変更
        </button>
      </div>
      {children}
    </StaffIdentityContext.Provider>
  );
}

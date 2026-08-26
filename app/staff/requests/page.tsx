"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ShiftRequest, RequestType } from "@/lib/types";
import { useStaffIdentity } from "@/lib/staffIdentity";
import { WEEKDAYS_MON_FIRST, weekdayIndexMonFirst } from "@/lib/constants";

export default function StaffRequestsPage() {
  const supabase = createClient();
  const { staffId } = useStaffIdentity();
  const [myRequests, setMyRequests] = useState<ShiftRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState("");
  const [type, setType] = useState<RequestType>("休み希望");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const todayStr = new Date().toISOString().slice(0, 10);
    const { data: reqs } = await supabase
      .from("shift_requests")
      .select("*")
      .eq("staff_id", staffId)
      .gte("work_date", todayStr)
      .order("work_date");
    setMyRequests(reqs ?? []);
    setLoading(false);
  }, [supabase, staffId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return;
    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase.from("shift_requests").insert({
        staff_id: staffId,
        work_date: date,
        type,
        note: note || null,
      });
      if (error) throw error;
      setDate("");
      setNote("");
      setType("休み希望");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await supabase.from("shift_requests").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-slate-800">希望を出す</h1>
        <p className="text-xs text-slate-500 mt-1">
          休みたい日や半休を希望する日を、日付を選んで管理者に伝えられます。
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3"
      >
        <div>
          <label className="block text-sm text-slate-600 mb-1">日付</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1">種別</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                checked={type === "休み希望"}
                onChange={() => setType("休み希望")}
              />
              休み希望
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                checked={type === "半休"}
                onChange={() => setType("半休")}
              />
              半休
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1">メモ（任意）</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="例: 通院のため"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2.5"
        >
          {saving ? "送信中..." : "希望を送信する"}
        </button>
      </form>

      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">提出済みの希望</h2>
        {loading ? (
          <p className="text-slate-400 text-sm">読み込み中...</p>
        ) : myRequests.length === 0 ? (
          <p className="text-slate-400 text-sm">まだ提出した希望はありません</p>
        ) : (
          <ul className="space-y-2">
            {myRequests.map((r) => {
              return (
                <li
                  key={r.id}
                  className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center justify-between text-sm"
                >
                  <div>
                    <span className="font-medium text-slate-700">
                      {r.work_date}（{WEEKDAYS_MON_FIRST[weekdayIndexMonFirst(r.work_date)]}）
                    </span>
                    <span
                      className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                        r.type === "半休"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {r.type}
                    </span>
                    {r.note && <p className="text-xs text-slate-400 mt-1">{r.note}</p>}
                  </div>
                  <button
                    onClick={() => remove(r.id)}
                    className="text-slate-400 hover:text-red-500 text-xs"
                  >
                    取り消し
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

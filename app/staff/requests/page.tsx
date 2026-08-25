"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ShiftType, ShiftRequest, RequestType } from "@/lib/types";

export default function StaffRequestsPage() {
  const supabase = createClient();
  const [staffId, setStaffId] = useState<string | null>(null);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [myRequests, setMyRequests] = useState<ShiftRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState("");
  const [type, setType] = useState<RequestType>("day_off");
  const [shiftTypeId, setShiftTypeId] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: staff } = await supabase
      .from("staff")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!staff) return;
    setStaffId(staff.id);

    const todayStr = new Date().toISOString().slice(0, 10);
    const [{ data: st }, { data: reqs }] = await Promise.all([
      supabase.from("shift_types").select("*").order("sort_order"),
      supabase
        .from("shift_requests")
        .select("*")
        .eq("staff_id", staff.id)
        .gte("work_date", todayStr)
        .order("work_date"),
    ]);
    setShiftTypes(st ?? []);
    setMyRequests(reqs ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!staffId || !date) return;
    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase.from("shift_requests").upsert(
        {
          staff_id: staffId,
          work_date: date,
          request_type: type,
          shift_type_id: type === "want_shift" ? shiftTypeId || null : null,
          note: note || null,
        },
        { onConflict: "staff_id,work_date,request_type" }
      );
      if (error) throw error;
      setDate("");
      setNote("");
      setShiftTypeId("");
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
          休みたい日や、この勤務に入りたいという希望を管理者に伝えられます。
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
                checked={type === "day_off"}
                onChange={() => setType("day_off")}
              />
              休み希望
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                checked={type === "want_shift"}
                onChange={() => setType("want_shift")}
              />
              勤務希望
            </label>
          </div>
        </div>

        {type === "want_shift" && (
          <div>
            <label className="block text-sm text-slate-600 mb-1">希望する勤務パターン</label>
            <select
              value={shiftTypeId}
              onChange={(e) => setShiftTypeId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">指定なし</option>
              {shiftTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

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
            {myRequests.map((r) => (
              <li
                key={r.id}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center justify-between text-sm"
              >
                <div>
                  <span className="font-medium text-slate-700">{r.work_date}</span>
                  <span
                    className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                      r.request_type === "day_off"
                        ? "bg-red-50 text-red-600"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {r.request_type === "day_off" ? "休み希望" : "勤務希望"}
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
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

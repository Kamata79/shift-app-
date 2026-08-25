"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Staff, ShiftType, ShiftRequest } from "@/lib/types";

export default function RequestsPage() {
  const supabase = createClient();
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const todayStr = new Date().toISOString().slice(0, 10);
    const [{ data: req }, { data: staff }, { data: st }] = await Promise.all([
      supabase
        .from("shift_requests")
        .select("*")
        .gte("work_date", todayStr)
        .order("work_date"),
      supabase.from("staff").select("*"),
      supabase.from("shift_types").select("*"),
    ]);
    setRequests(req ?? []);
    setStaffList(staff ?? []);
    setShiftTypes(st ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id: string) {
    await supabase.from("shift_requests").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-800">職員からの希望一覧</h1>
        <p className="text-sm text-slate-500 mt-1">
          今日以降に提出された休み希望・勤務希望です。内容を確認しながらシフトカレンダーで反映してください。
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left px-4 py-2 font-medium">日付</th>
              <th className="text-left px-4 py-2 font-medium">職員</th>
              <th className="text-left px-4 py-2 font-medium">種別</th>
              <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">メモ</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-6 text-slate-400">
                  読み込み中...
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-6 text-slate-400">
                  提出されている希望はまだありません
                </td>
              </tr>
            ) : (
              requests.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 whitespace-nowrap">{r.work_date}</td>
                  <td className="px-4 py-2">
                    {staffList.find((s) => s.id === r.staff_id)?.full_name ?? "-"}
                  </td>
                  <td className="px-4 py-2">
                    {r.request_type === "day_off" ? (
                      <span className="text-red-600 bg-red-50 text-xs px-2 py-0.5 rounded-full">
                        休み希望
                      </span>
                    ) : (
                      <span className="text-emerald-700 bg-emerald-50 text-xs px-2 py-0.5 rounded-full">
                        勤務希望
                        {r.shift_type_id
                          ? `（${shiftTypes.find((t) => t.id === r.shift_type_id)?.name ?? ""}）`
                          : ""}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 hidden sm:table-cell text-slate-500">
                    {r.note || "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => remove(r.id)}
                      className="text-slate-400 hover:text-red-500 text-xs"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

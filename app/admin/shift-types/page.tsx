"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ShiftType, StaffingRule } from "@/lib/types";
import { WEEKDAYS_MON_FIRST } from "@/lib/constants";

export default function ShiftTypesPage() {
  const supabase = createClient();
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [rules, setRules] = useState<StaffingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: st }, { data: sr }] = await Promise.all([
      supabase.from("shift_types").select("*").order("sort_order"),
      supabase.from("staffing_rules").select("*"),
    ]);
    setShiftTypes(st ?? []);
    setRules(sr ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateTime(id: string, field: "start_time" | "end_time", value: string) {
    setShiftTypes((prev) =>
      prev.map((st) => (st.id === id ? { ...st, [field]: value } : st))
    );
    setSavingId(id);
    await supabase.from("shift_types").update({ [field]: value }).eq("id", id);
    setSavingId(null);
  }

  function ruleValue(weekday: number, shiftTypeId: string) {
    return rules.find((r) => r.weekday === weekday && r.shift_type_id === shiftTypeId)?.min_count ?? 0;
  }

  async function changeRule(weekday: number, shiftTypeId: string, delta: number) {
    const current = ruleValue(weekday, shiftTypeId);
    const next = Math.max(0, current + delta);

    setRules((prev) => {
      const exists = prev.some((r) => r.weekday === weekday && r.shift_type_id === shiftTypeId);
      if (exists) {
        return prev.map((r) =>
          r.weekday === weekday && r.shift_type_id === shiftTypeId
            ? { ...r, min_count: next }
            : r
        );
      }
      return [...prev, { weekday, shift_type_id: shiftTypeId, min_count: next }];
    });

    await supabase
      .from("staffing_rules")
      .upsert(
        { weekday, shift_type_id: shiftTypeId, min_count: next },
        { onConflict: "weekday,shift_type_id" }
      );
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-lg font-bold text-slate-800">勤務パターン</h1>
        <p className="text-sm text-slate-500 mt-1">
          早番・日勤・遅出・夜勤、それぞれの開始〜終了時刻を設定します。夜勤のように日をまたぐ時間帯にも対応しています。
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left px-4 py-2 font-medium">勤務パターン</th>
              <th className="text-left px-4 py-2 font-medium">開始</th>
              <th className="text-left px-4 py-2 font-medium">終了</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="text-center py-6 text-slate-400">
                  読み込み中...
                </td>
              </tr>
            ) : (
              shiftTypes.map((st) => (
                <tr key={st.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">
                    <span className="flex items-center gap-2 font-medium text-slate-700">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: st.color }}
                      />
                      {st.name}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="time"
                      value={st.start_time.slice(0, 5)}
                      onChange={(e) => updateTime(st.id, "start_time", e.target.value)}
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="time"
                      value={st.end_time.slice(0, 5)}
                      onChange={(e) => updateTime(st.id, "end_time", e.target.value)}
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                    />
                    {st.end_time < st.start_time && (
                      <span className="ml-2 text-xs text-slate-400">翌日</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-400">
                    {savingId === st.id ? "保存中..." : ""}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-800">人員配置基準</h2>
        <p className="text-sm text-slate-500 mt-1">
          曜日ごとに、勤務パターン別の最低必要人数をポチポチと設定します。ここで決めた人数がシフトカレンダーの初期値になり、実際の割り当てはカレンダー上で微調整できます。
        </p>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">読み込み中...</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {WEEKDAYS_MON_FIRST.map((wd, weekday) => {
            const total = shiftTypes.reduce((sum, st) => sum + ruleValue(weekday, st.id), 0);
            const isSun = weekday === 6;
            const isSat = weekday === 5;
            return (
              <div
                key={weekday}
                className={`bg-white border rounded-2xl p-4 ${
                  isSun
                    ? "border-red-200"
                    : isSat
                    ? "border-blue-200"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`font-semibold ${
                      isSun ? "text-red-500" : isSat ? "text-blue-500" : "text-slate-700"
                    }`}
                  >
                    {wd}曜日
                  </span>
                  <span className="text-xs text-slate-400">
                    最低 <span className="font-semibold text-slate-600">{total}</span>名
                  </span>
                </div>
                <div className="space-y-1.5">
                  {shiftTypes.map((st) => (
                    <div key={st.id} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: st.color }}
                        />
                        {st.name}
                      </span>
                      <span className="inline-flex items-center rounded-lg border border-slate-200 overflow-hidden">
                        <button
                          onClick={() => changeRule(weekday, st.id, -1)}
                          className="w-6 h-6 text-slate-500 hover:bg-slate-100"
                        >
                          −
                        </button>
                        <span className="w-7 text-center font-medium text-slate-700">
                          {ruleValue(weekday, st.id)}
                        </span>
                        <button
                          onClick={() => changeRule(weekday, st.id, 1)}
                          className="w-6 h-6 text-slate-500 hover:bg-slate-100"
                        >
                          ＋
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

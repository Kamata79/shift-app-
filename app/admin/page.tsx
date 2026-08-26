"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Staff, ShiftType, StaffingRule, Shift, ShiftRequest } from "@/lib/types";
import { weekdayIndexMonFirst } from "@/lib/constants";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}
function toDateStr(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}
function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}
const WEEKDAY_JA_SUN_FIRST = ["日", "月", "火", "水", "木", "金", "土"];

export default function AdminCalendarPage() {
  const supabase = createClient();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [rules, setRules] = useState<StaffingRule[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const numDays = daysInMonth(year, month);
  const dates = useMemo(
    () => Array.from({ length: numDays }, (_, i) => toDateStr(year, month, i + 1)),
    [year, month, numDays]
  );

  const load = useCallback(async () => {
    setLoading(true);
    const monthStart = toDateStr(year, month, 1);
    const monthEnd = toDateStr(year, month, numDays);

    const [
      { data: staffRows },
      { data: st },
      { data: sr },
      { data: sh },
      { data: req },
    ] = await Promise.all([
      supabase.from("staff").select("*").eq("active", true).order("created_at"),
      supabase.from("shift_types").select("*").order("sort_order"),
      supabase.from("staffing_rules").select("*"),
      supabase
        .from("shifts")
        .select("*")
        .gte("work_date", monthStart)
        .lte("work_date", monthEnd),
      supabase
        .from("shift_requests")
        .select("*")
        .gte("work_date", monthStart)
        .lte("work_date", monthEnd),
    ]);

    setStaffList(staffRows ?? []);
    setShiftTypes(st ?? []);
    setRules(sr ?? []);
    setShifts(sh ?? []);
    setRequests(req ?? []);
    setLoading(false);
  }, [supabase, year, month, numDays]);

  useEffect(() => {
    load();
  }, [load]);

  const shiftMap = useMemo(() => {
    const m = new Map<string, Shift>();
    shifts.forEach((s) => m.set(`${s.staff_id}_${s.work_date}`, s));
    return m;
  }, [shifts]);

  const requestsByDate = useMemo(() => {
    const m = new Map<string, ShiftRequest[]>();
    requests.forEach((r) => {
      m.set(r.work_date, [...(m.get(r.work_date) ?? []), r]);
    });
    return m;
  }, [requests]);

  function ruleValue(weekday: number, shiftTypeId: string) {
    return rules.find((r) => r.weekday === weekday && r.shift_type_id === shiftTypeId)?.min_count ?? 0;
  }

  // 日付 x 勤務パターン ごとの割当人数を集計（カレンダー下部の割り当て表用）
  const dailyCounts = useMemo(() => {
    const counts = new Map<string, number>();
    shifts.forEach((s) => {
      const key = `${s.work_date}_${s.shift_type_id}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return counts;
  }, [shifts]);

  async function assignShift(staffId: string, date: string, shiftTypeId: string) {
    const key = `${staffId}_${date}`;
    setSavingKey(key);
    if (!shiftTypeId) {
      await supabase.from("shifts").delete().eq("staff_id", staffId).eq("work_date", date);
    } else {
      await supabase
        .from("shifts")
        .upsert(
          { staff_id: staffId, work_date: date, shift_type_id: shiftTypeId },
          { onConflict: "staff_id,work_date" }
        );
    }
    await load();
    setSavingKey(null);
  }

  function changeMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  const totalStaff = staffList.length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">シフトカレンダー</h1>
          <p className="text-sm text-slate-500 mt-1">
            人員配置基準の最低人数が自動で入り、希望一覧の休み希望と照らし合わせて過不足を確認できます。
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-2 py-1">
          <button onClick={() => changeMonth(-1)} className="px-2 py-1 text-slate-500 hover:text-slate-800">
            ←
          </button>
          <span className="font-medium text-slate-700 text-sm w-24 text-center">
            {year}年{month + 1}月
          </span>
          <button onClick={() => changeMonth(1)} className="px-2 py-1 text-slate-500 hover:text-slate-800">
            →
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">読み込み中...</p>
      ) : (
        <>
          {/* 曜日別の必要人数 × 休み希望の突き合わせ */}
          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
            <div className="px-4 py-2 text-xs font-medium text-slate-400 flex gap-4">
              <span className="w-16">日付</span>
              <span className="flex-1">最低必要人数</span>
              <span className="flex-[1.6]">休み希望</span>
              <span className="w-32 text-right">状況</span>
            </div>
            {dates.map((d) => {
              const day = Number(d.split("-")[2]);
              const jsWd = new Date(d + "T00:00:00").getDay();
              const weekday = weekdayIndexMonFirst(d);
              const requiredTotal = shiftTypes.reduce(
                (sum, st) => sum + ruleValue(weekday, st.id),
                0
              );
              const dayReqs = requestsByDate.get(d) ?? [];
              const offCount = dayReqs.reduce((sum, r) => sum + (r.type === "半休" ? 0.5 : 1), 0);
              const available = totalStaff - offCount;
              const shortage = requiredTotal - available;
              const isWarn = shortage > 0;
              const slack = Math.max(0, available - requiredTotal);
              const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

              return (
                <div key={d} className="px-4 py-2.5 flex items-center gap-4 text-sm">
                  <span className="w-16">
                    <span
                      className={`font-semibold ${
                        jsWd === 0 ? "text-red-500" : jsWd === 6 ? "text-blue-500" : "text-slate-700"
                      }`}
                    >
                      {day}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">{WEEKDAY_JA_SUN_FIRST[jsWd]}</span>
                  </span>
                  <span className="flex-1 flex flex-wrap gap-1">
                    {shiftTypes.map((st) => (
                      <span
                        key={st.id}
                        className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 inline-flex items-center gap-1"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full inline-block"
                          style={{ backgroundColor: st.color }}
                        />
                        {st.name}
                        {ruleValue(weekday, st.id)}
                      </span>
                    ))}
                  </span>
                  <span className="flex-[1.6] flex flex-wrap gap-1">
                    {dayReqs.length === 0 ? (
                      <span className="text-xs text-slate-300">休み希望なし</span>
                    ) : (
                      dayReqs.map((r) => (
                        <span
                          key={r.id}
                          className="text-xs bg-white border border-slate-200 rounded-full px-2 py-0.5"
                        >
                          {staffList.find((s) => s.id === r.staff_id)?.full_name ?? "?"}
                          <span className="text-slate-400 ml-1">{r.type === "半休" ? "半休" : "休み"}</span>
                        </span>
                      ))
                    )}
                  </span>
                  <span className="w-32 text-right">
                    {isWarn ? (
                      <span className="inline-flex flex-col items-end bg-red-50 text-red-600 rounded-lg px-2.5 py-1">
                        <span className="text-xs font-bold">⚠ 人員不足</span>
                        <span className="text-[10px]">最低{requiredTotal}名に対し{fmt(shortage)}名不足</span>
                      </span>
                    ) : (
                      <span className="inline-flex flex-col items-end bg-emerald-50 text-emerald-700 rounded-lg px-2.5 py-1">
                        <span className="text-xs font-bold">余裕あり</span>
                        <span className="text-[10px]">あと{fmt(slack)}名まで休み可</span>
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 実際の割り当て（微調整用） */}
          <div>
            <h2 className="text-base font-bold text-slate-800 mb-1">職員ごとの割り当て</h2>
            <p className="text-xs text-slate-500 mb-3">
              セルをクリックして勤務パターンを割り当てます。実際の人数はここで微調整できます。
            </p>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
              <table className="text-xs border-collapse min-w-max">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-white z-10 px-3 py-2 text-left border-b border-slate-200 min-w-[120px]">
                      職員
                    </th>
                    {dates.map((d) => {
                      const day = Number(d.split("-")[2]);
                      const wd = new Date(d + "T00:00:00").getDay();
                      return (
                        <th
                          key={d}
                          className={`px-1 py-2 text-center border-b border-slate-200 min-w-[52px] font-normal ${
                            wd === 0 ? "text-red-500" : wd === 6 ? "text-blue-500" : "text-slate-500"
                          }`}
                        >
                          {day}
                          <div className="text-[10px]">{WEEKDAY_JA_SUN_FIRST[wd]}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {/* 配置基準チェック行（勤務パターンごとの実際の割当人数 / 基準） */}
                  {shiftTypes.map((st) => (
                    <tr key={`rule-${st.id}`} className="bg-slate-50">
                      <td className="sticky left-0 bg-slate-50 z-10 px-3 py-1.5 text-slate-500 border-b border-slate-200">
                        基準: {st.name}
                      </td>
                      {dates.map((d) => {
                        const weekday = weekdayIndexMonFirst(d);
                        const need = ruleValue(weekday, st.id);
                        const actual = dailyCounts.get(`${d}_${st.id}`) ?? 0;
                        const isShort = actual < need;
                        return (
                          <td
                            key={d}
                            className={`px-1 py-1.5 text-center border-b border-slate-200 ${
                              isShort ? "text-red-600 font-semibold bg-red-50" : "text-slate-400"
                            }`}
                          >
                            {actual}/{need}
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {staffList.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/60">
                      <td className="sticky left-0 bg-white z-10 px-3 py-1.5 border-b border-slate-100 font-medium text-slate-700 whitespace-nowrap">
                        {s.full_name}
                      </td>
                      {dates.map((d) => {
                        const key = `${s.id}_${d}`;
                        const shift = shiftMap.get(key);
                        const hasOffRequest = (requestsByDate.get(d) ?? []).some(
                          (r) => r.staff_id === s.id
                        );
                        return (
                          <td
                            key={d}
                            className={`border-b border-slate-100 p-0.5 ${hasOffRequest ? "bg-red-50" : ""}`}
                          >
                            <select
                              value={shift?.shift_type_id ?? ""}
                              disabled={savingKey === key}
                              onChange={(e) => assignShift(s.id, d, e.target.value)}
                              className="w-full text-[11px] rounded border-0 bg-transparent py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
                              style={
                                shift
                                  ? {
                                      backgroundColor:
                                        shiftTypes.find((t) => t.id === shift.shift_type_id)?.color +
                                        "33",
                                    }
                                  : undefined
                              }
                            >
                              <option value="">-</option>
                              {shiftTypes.map((st) => (
                                <option key={st.id} value={st.id}>
                                  {st.name}
                                </option>
                              ))}
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {staffList.length === 0 && !loading && (
        <p className="text-sm text-slate-400">
          まず「職員管理」から職員を登録してください。
        </p>
      )}
    </div>
  );
}

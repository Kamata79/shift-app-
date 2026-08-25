"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Staff, ShiftType, StaffingRule, Shift, ShiftRequest } from "@/lib/types";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}
function toDateStr(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}
function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}
const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"];

export default function AdminCalendarPage() {
  const supabase = createClient();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed

  const [staffList, setStaffList] = useState<(Staff & { qualificationIds: string[] })[]>([]);
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
      { data: linkRows },
      { data: st },
      { data: sr },
      { data: sh },
      { data: req },
    ] = await Promise.all([
      supabase.from("staff").select("*").eq("active", true).order("created_at"),
      supabase.from("staff_qualifications").select("*"),
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

    setStaffList(
      (staffRows ?? []).map((s) => ({
        ...s,
        qualificationIds: (linkRows ?? [])
          .filter((l) => l.staff_id === s.id)
          .map((l) => l.qualification_id),
      }))
    );
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

  const requestMap = useMemo(() => {
    const m = new Map<string, ShiftRequest[]>();
    requests.forEach((r) => {
      const key = `${r.staff_id}_${r.work_date}`;
      m.set(key, [...(m.get(key) ?? []), r]);
    });
    return m;
  }, [requests]);

  // 日付 x 勤務パターン ごとの割当人数・資格者人数を集計
  const dailyCounts = useMemo(() => {
    const counts = new Map<string, { total: number; qualified: number }>();
    shifts.forEach((s) => {
      const key = `${s.work_date}_${s.shift_type_id}`;
      const staffMember = staffList.find((st) => st.id === s.staff_id);
      const rule = rules.find((r) => r.shift_type_id === s.shift_type_id);
      const isQualified =
        !!rule?.required_qualification_id &&
        !!staffMember?.qualificationIds.includes(rule.required_qualification_id);
      const prev = counts.get(key) ?? { total: 0, qualified: 0 };
      counts.set(key, {
        total: prev.total + 1,
        qualified: prev.qualified + (isQualified ? 1 : 0),
      });
    });
    return counts;
  }, [shifts, staffList, rules]);

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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">シフトカレンダー</h1>
          <p className="text-sm text-slate-500 mt-1">
            セルをクリックして勤務パターンを選択してください。基準を下回ると赤字で警告します。
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

      {/* 凡例 */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        {shiftTypes.map((st) => (
          <span key={st.id} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: st.color }} />
            {st.name}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full inline-block bg-red-200" /> 休み希望
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full inline-block bg-emerald-200" /> 勤務希望
        </span>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">読み込み中...</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
          <table className="text-xs border-collapse min-w-max">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white z-10 px-3 py-2 text-left border-b border-slate-200 min-w-[120px]">
                  職員
                </th>
                {dates.map((d) => {
                  const day = Number(d.split("-")[2]);
                  const wd = new Date(d).getDay();
                  return (
                    <th
                      key={d}
                      className={`px-1 py-2 text-center border-b border-slate-200 min-w-[52px] font-normal ${
                        wd === 0 ? "text-red-500" : wd === 6 ? "text-blue-500" : "text-slate-500"
                      }`}
                    >
                      {day}
                      <div className="text-[10px]">{WEEKDAY_JA[wd]}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {/* 配置基準チェック行 */}
              {shiftTypes.map((st) => {
                const rule = rules.find((r) => r.shift_type_id === st.id);
                if (!rule) return null;
                return (
                  <tr key={`rule-${st.id}`} className="bg-slate-50">
                    <td className="sticky left-0 bg-slate-50 z-10 px-3 py-1.5 text-slate-500 border-b border-slate-200">
                      基準: {st.name}
                    </td>
                    {dates.map((d) => {
                      const c = dailyCounts.get(`${d}_${st.id}`) ?? { total: 0, qualified: 0 };
                      const shortStaff = c.total < rule.min_staff_count;
                      const shortQualified =
                        rule.min_qualified_count > 0 && c.qualified < rule.min_qualified_count;
                      const isShort = shortStaff || shortQualified;
                      return (
                        <td
                          key={d}
                          className={`px-1 py-1.5 text-center border-b border-slate-200 ${
                            isShort ? "text-red-600 font-semibold bg-red-50" : "text-slate-400"
                          }`}
                          title={
                            isShort
                              ? `必要人数 ${rule.min_staff_count}人${
                                  rule.min_qualified_count > 0
                                    ? ` / 有資格 ${rule.min_qualified_count}人`
                                    : ""
                                } に対し 実際 ${c.total}人${
                                  rule.min_qualified_count > 0 ? ` (有資格${c.qualified}人)` : ""
                                }`
                              : undefined
                          }
                        >
                          {c.total}/{rule.min_staff_count}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {staffList.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/60">
                  <td className="sticky left-0 bg-white z-10 px-3 py-1.5 border-b border-slate-100 font-medium text-slate-700 whitespace-nowrap">
                    {s.full_name}
                  </td>
                  {dates.map((d) => {
                    const key = `${s.id}_${d}`;
                    const shift = shiftMap.get(key);
                    const reqs = requestMap.get(key) ?? [];
                    const hasDayOff = reqs.some((r) => r.request_type === "day_off");
                    const hasWant = reqs.some((r) => r.request_type === "want_shift");
                    const bg = hasDayOff ? "bg-red-50" : hasWant ? "bg-emerald-50" : "";
                    return (
                      <td key={d} className={`border-b border-slate-100 p-0.5 ${bg}`}>
                        <select
                          value={shift?.shift_type_id ?? ""}
                          disabled={savingKey === key}
                          onChange={(e) => assignShift(s.id, d, e.target.value)}
                          title={reqs.map((r) => r.note).filter(Boolean).join(" / ")}
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
      )}

      {staffList.length === 0 && !loading && (
        <p className="text-sm text-slate-400">
          まず「職員管理」から職員を登録してください。
        </p>
      )}
    </div>
  );
}

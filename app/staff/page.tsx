"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Shift, ShiftType } from "@/lib/types";
import { useStaffIdentity } from "@/lib/staffIdentity";

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

export default function StaffHomePage() {
  const supabase = createClient();
  const { staffId, staffName } = useStaffIdentity();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [loading, setLoading] = useState(true);

  const numDays = daysInMonth(year, month);
  const dates = useMemo(
    () => Array.from({ length: numDays }, (_, i) => toDateStr(year, month, i + 1)),
    [year, month, numDays]
  );

  const load = useCallback(async () => {
    setLoading(true);
    const monthStart = toDateStr(year, month, 1);
    const monthEnd = toDateStr(year, month, numDays);

    const [{ data: sh }, { data: st }] = await Promise.all([
      supabase
        .from("shifts")
        .select("*")
        .eq("staff_id", staffId)
        .gte("work_date", monthStart)
        .lte("work_date", monthEnd),
      supabase.from("shift_types").select("*").order("sort_order"),
    ]);
    setShifts(sh ?? []);
    setShiftTypes(st ?? []);
    setLoading(false);
  }, [supabase, year, month, numDays, staffId]);

  useEffect(() => {
    load();
  }, [load]);

  const shiftByDate = useMemo(() => {
    const m = new Map<string, Shift>();
    shifts.forEach((s) => m.set(s.work_date, s));
    return m;
  }, [shifts]);

  function changeMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-slate-800">{staffName} さんの今月のシフト</h1>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1">
          <button onClick={() => changeMonth(-1)} className="px-2 text-slate-500">
            ←
          </button>
          <span className="text-sm font-medium w-20 text-center">
            {year}年{month + 1}月
          </span>
          <button onClick={() => changeMonth(1)} className="px-2 text-slate-500">
            →
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">読み込み中...</p>
      ) : (
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAY_JA.map((w) => (
            <div key={w} className="text-center text-xs text-slate-400 py-1">
              {w}
            </div>
          ))}
          {Array.from({ length: new Date(year, month, 1).getDay() }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {dates.map((d) => {
            const shift = shiftByDate.get(d);
            const type = shiftTypes.find((t) => t.id === shift?.shift_type_id);
            const day = Number(d.split("-")[2]);
            return (
              <div
                key={d}
                className="aspect-square rounded-lg border border-slate-200 bg-white flex flex-col items-center justify-center text-center p-1"
                style={type ? { backgroundColor: type.color + "22" } : undefined}
              >
                <span className="text-xs text-slate-500">{day}</span>
                {type && (
                  <span
                    className="text-[10px] font-medium mt-0.5 leading-tight"
                    style={{ color: type.color }}
                  >
                    {type.name}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-xs text-slate-500 pt-2">
        {shiftTypes.map((t) => (
          <span key={t.id} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: t.color }} />
            {t.name} ({t.start_time.slice(0, 5)}-{t.end_time.slice(0, 5)})
          </span>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ShiftType, StaffingRule, Qualification } from "@/lib/types";

const emptyShiftForm = {
  id: "",
  name: "",
  start_time: "09:00",
  end_time: "18:00",
  color: "#4F86C6",
};

const emptyRuleForm = {
  id: "",
  shift_type_id: "",
  min_staff_count: "1",
  required_qualification_id: "",
  min_qualified_count: "0",
};

export default function ShiftTypesPage() {
  const supabase = createClient();
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [rules, setRules] = useState<StaffingRule[]>([]);
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [shiftForm, setShiftForm] = useState(emptyShiftForm);
  const [ruleForm, setRuleForm] = useState(emptyRuleForm);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: st }, { data: sr }, { data: q }] = await Promise.all([
      supabase.from("shift_types").select("*").order("sort_order"),
      supabase.from("staffing_rules").select("*"),
      supabase.from("qualifications").select("*").order("name"),
    ]);
    setShiftTypes(st ?? []);
    setRules(sr ?? []);
    setQualifications(q ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveShiftType(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: shiftForm.name,
      start_time: shiftForm.start_time,
      end_time: shiftForm.end_time,
      color: shiftForm.color,
      sort_order: shiftTypes.length,
    };
    if (shiftForm.id) {
      await supabase.from("shift_types").update(payload).eq("id", shiftForm.id);
    } else {
      await supabase.from("shift_types").insert(payload);
    }
    setShiftForm(emptyShiftForm);
    load();
  }

  async function deleteShiftType(id: string) {
    if (!confirm("この勤務パターンを削除しますか？")) return;
    await supabase.from("shift_types").delete().eq("id", id);
    load();
  }

  async function saveRule(e: React.FormEvent) {
    e.preventDefault();
    if (!ruleForm.shift_type_id) return;
    const payload = {
      shift_type_id: ruleForm.shift_type_id,
      min_staff_count: Number(ruleForm.min_staff_count) || 0,
      required_qualification_id: ruleForm.required_qualification_id || null,
      min_qualified_count: Number(ruleForm.min_qualified_count) || 0,
    };
    if (ruleForm.id) {
      await supabase.from("staffing_rules").update(payload).eq("id", ruleForm.id);
    } else {
      await supabase.from("staffing_rules").insert(payload);
    }
    setRuleForm(emptyRuleForm);
    load();
  }

  async function deleteRule(id: string) {
    await supabase.from("staffing_rules").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-lg font-bold text-slate-800">勤務パターン</h1>
        <p className="text-sm text-slate-500 mt-1">
          早番・日勤・遅番など、事業所で使う勤務の種類を設定します。
        </p>
      </div>

      <form
        onSubmit={saveShiftType}
        className="bg-white border border-slate-200 rounded-2xl p-5 grid sm:grid-cols-5 gap-3 items-end"
      >
        <div className="sm:col-span-2">
          <label className="block text-sm text-slate-600 mb-1">名称</label>
          <input
            required
            value={shiftForm.name}
            onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="例: 早番"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">開始</label>
          <input
            type="time"
            required
            value={shiftForm.start_time}
            onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">終了</label>
          <input
            type="time"
            required
            value={shiftForm.end_time}
            onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2 items-end">
          <div>
            <label className="block text-sm text-slate-600 mb-1">色</label>
            <input
              type="color"
              value={shiftForm.color}
              onChange={(e) => setShiftForm({ ...shiftForm, color: e.target.value })}
              className="h-9 w-12 rounded-lg border border-slate-300"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2 h-9"
          >
            {shiftForm.id ? "更新" : "追加"}
          </button>
        </div>
      </form>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? (
          <p className="text-slate-400 text-sm">読み込み中...</p>
        ) : (
          shiftTypes.map((st) => (
            <div
              key={st.id}
              className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full inline-block"
                    style={{ backgroundColor: st.color }}
                  />
                  <span className="font-medium text-slate-800">{st.name}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {st.start_time.slice(0, 5)} - {st.end_time.slice(0, 5)}
                </p>
              </div>
              <div className="flex gap-2 text-sm">
                <button
                  onClick={() =>
                    setShiftForm({
                      id: st.id,
                      name: st.name,
                      start_time: st.start_time.slice(0, 5),
                      end_time: st.end_time.slice(0, 5),
                      color: st.color,
                    })
                  }
                  className="text-blue-600 hover:underline"
                >
                  編集
                </button>
                <button
                  onClick={() => deleteShiftType(st.id)}
                  className="text-red-500 hover:underline"
                >
                  削除
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-800">人員配置基準</h2>
        <p className="text-sm text-slate-500 mt-1">
          各勤務パターンで最低限必要な人数・有資格者数を設定します。シフト作成時にこの基準を下回ると警告が表示されます。
        </p>
      </div>

      <form
        onSubmit={saveRule}
        className="bg-white border border-slate-200 rounded-2xl p-5 grid sm:grid-cols-5 gap-3 items-end"
      >
        <div>
          <label className="block text-sm text-slate-600 mb-1">勤務パターン</label>
          <select
            required
            value={ruleForm.shift_type_id}
            onChange={(e) => setRuleForm({ ...ruleForm, shift_type_id: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">選択してください</option>
            {shiftTypes.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">最低人数</label>
          <input
            type="number"
            min={0}
            value={ruleForm.min_staff_count}
            onChange={(e) => setRuleForm({ ...ruleForm, min_staff_count: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">必要資格</label>
          <select
            value={ruleForm.required_qualification_id}
            onChange={(e) =>
              setRuleForm({ ...ruleForm, required_qualification_id: e.target.value })
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">指定なし</option>
            {qualifications.map((q) => (
              <option key={q.id} value={q.id}>
                {q.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">必要最低人数</label>
          <input
            type="number"
            min={0}
            value={ruleForm.min_qualified_count}
            onChange={(e) =>
              setRuleForm({ ...ruleForm, min_qualified_count: e.target.value })
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2 h-9"
        >
          {ruleForm.id ? "更新" : "追加"}
        </button>
      </form>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left px-4 py-2 font-medium">勤務パターン</th>
              <th className="text-left px-4 py-2 font-medium">最低人数</th>
              <th className="text-left px-4 py-2 font-medium">必要資格</th>
              <th className="text-left px-4 py-2 font-medium">資格者最低人数</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-6 text-slate-400">
                  基準が設定されていません
                </td>
              </tr>
            ) : (
              rules.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">
                    {shiftTypes.find((s) => s.id === r.shift_type_id)?.name ?? "-"}
                  </td>
                  <td className="px-4 py-2">{r.min_staff_count}人</td>
                  <td className="px-4 py-2">
                    {qualifications.find((q) => q.id === r.required_qualification_id)
                      ?.name ?? "指定なし"}
                  </td>
                  <td className="px-4 py-2">{r.min_qualified_count}人</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() =>
                        setRuleForm({
                          id: r.id,
                          shift_type_id: r.shift_type_id,
                          min_staff_count: String(r.min_staff_count),
                          required_qualification_id: r.required_qualification_id ?? "",
                          min_qualified_count: String(r.min_qualified_count),
                        })
                      }
                      className="text-blue-600 hover:underline mr-3"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => deleteRule(r.id)}
                      className="text-red-500 hover:underline"
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

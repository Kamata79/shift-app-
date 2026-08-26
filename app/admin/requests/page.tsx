"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Staff, ShiftRequest, RequestType } from "@/lib/types";
import { WEEKDAYS_MON_FIRST, weekdayIndexMonFirst } from "@/lib/constants";

const emptyForm = {
  id: "",
  staff_id: "",
  work_date: "",
  type: "休み希望" as RequestType,
  note: "",
};

export default function RequestsPage() {
  const supabase = createClient();
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: req }, { data: staff }] = await Promise.all([
      supabase.from("shift_requests").select("*").order("work_date"),
      supabase.from("staff").select("*").order("full_name"),
    ]);
    setRequests(req ?? []);
    setStaffList(staff ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  function startAdd() {
    setForm({ ...emptyForm, staff_id: staffList[0]?.id ?? "" });
    setFormOpen(true);
    setError(null);
  }

  function startEdit(r: ShiftRequest) {
    setForm({
      id: r.id,
      staff_id: r.staff_id,
      work_date: r.work_date,
      type: r.type,
      note: r.note ?? "",
    });
    setFormOpen(true);
    setError(null);
  }

  function cancelForm() {
    setForm(emptyForm);
    setFormOpen(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.staff_id || !form.work_date) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        staff_id: form.staff_id,
        work_date: form.work_date,
        type: form.type,
        note: form.note || null,
      };
      if (form.id) {
        const { error } = await supabase.from("shift_requests").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("shift_requests").insert(payload);
        if (error) throw error;
      }
      cancelForm();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("この希望を削除しますか？")) return;
    await supabase.from("shift_requests").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800">希望一覧</h1>
          <p className="text-sm text-slate-500 mt-1">
            職員から提出された休み希望・半休希望を確認し、内容の修正もここから行えます。
          </p>
        </div>
        {!formOpen && (
          <button
            onClick={startAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2 whitespace-nowrap"
          >
            ＋ 希望を登録
          </button>
        )}
      </div>

      {formOpen && (
        <form
          onSubmit={handleSubmit}
          className="bg-blue-50 border border-dashed border-blue-300 rounded-2xl p-5 space-y-4"
        >
          <h2 className="font-semibold text-blue-800">
            {form.id ? "希望内容を編集" : "希望を登録"}
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">職員</label>
              <select
                required
                value={form.staff_id}
                onChange={(e) => setForm({ ...form, staff_id: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">日付</label>
              <input
                type="date"
                required
                value={form.work_date}
                onChange={(e) => setForm({ ...form, work_date: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">種別</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as RequestType })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="休み希望">休み希望</option>
                <option value="半休">半休</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">メモ（任意）</label>
            <input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="例）通院のため"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2"
            >
              {saving ? "保存中..." : form.id ? "更新する" : "登録する"}
            </button>
            <button type="button" onClick={cancelForm} className="text-sm text-slate-500 px-4 py-2">
              キャンセル
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left px-4 py-2 font-medium">職員</th>
              <th className="text-left px-4 py-2 font-medium">日付</th>
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
              requests.map((r) => {
                const d = new Date(r.work_date + "T00:00:00");
                return (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium text-slate-700">
                      {staffList.find((s) => s.id === r.staff_id)?.full_name ?? "（削除済み職員）"}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {d.getMonth() + 1}/{d.getDate()}（{WEEKDAYS_MON_FIRST[weekdayIndexMonFirst(r.work_date)]}）
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          r.type === "半休"
                            ? "text-emerald-700 bg-emerald-50"
                            : "text-red-600 bg-red-50"
                        }`}
                      >
                        {r.type}
                      </span>
                    </td>
                    <td className="px-4 py-2 hidden sm:table-cell text-slate-500">
                      {r.note || "—"}
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => startEdit(r)}
                        className="text-blue-600 hover:underline mr-3"
                      >
                        編集
                      </button>
                      <button onClick={() => remove(r.id)} className="text-red-500 hover:underline">
                        削除
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

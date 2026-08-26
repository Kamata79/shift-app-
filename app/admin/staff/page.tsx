"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Staff, Qualification } from "@/lib/types";
import { EMPLOYMENT_TYPES, POSITIONS } from "@/lib/constants";

type StaffWithQuals = Staff & { qualificationIds: string[] };

const emptyForm = {
  id: "",
  full_name: "",
  employment_type: EMPLOYMENT_TYPES[0] as string,
  position: "",
  qualificationIds: [] as string[],
};

export default function StaffPage() {
  const supabase = createClient();
  const [staffList, setStaffList] = useState<StaffWithQuals[]>([]);
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: staffRows }, { data: qualRows }, { data: linkRows }] =
      await Promise.all([
        supabase.from("staff").select("*").order("created_at"),
        supabase.from("qualifications").select("*").order("name"),
        supabase.from("staff_qualifications").select("*"),
      ]);

    const withQuals = (staffRows ?? []).map((s) => ({
      ...s,
      qualificationIds: (linkRows ?? [])
        .filter((l) => l.staff_id === s.id)
        .map((l) => l.qualification_id),
    }));

    setStaffList(withQuals);
    setQualifications(qualRows ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(s: StaffWithQuals) {
    setForm({
      id: s.id,
      full_name: s.full_name,
      employment_type: s.employment_type ?? EMPLOYMENT_TYPES[0],
      position: s.position ?? "",
      qualificationIds: s.qualificationIds,
    });
    setEditing(true);
  }

  function resetForm() {
    setForm(emptyForm);
    setEditing(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        full_name: form.full_name.trim(),
        employment_type: form.employment_type,
        position: form.position || null,
      };

      let staffId = form.id;

      if (form.id) {
        const { error } = await supabase.from("staff").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("staff")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        staffId = data.id;
      }

      // 資格の紐付けを差し替え
      await supabase.from("staff_qualifications").delete().eq("staff_id", staffId);
      if (form.qualificationIds.length > 0) {
        await supabase.from("staff_qualifications").insert(
          form.qualificationIds.map((qid) => ({
            staff_id: staffId,
            qualification_id: qid,
          }))
        );
      }

      resetForm();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("この職員を削除しますか？関連するシフトも削除されます。")) return;
    await supabase.from("staff").delete().eq("id", id);
    load();
  }

  async function toggleActive(s: StaffWithQuals) {
    await supabase.from("staff").update({ active: !s.active }).eq("id", s.id);
    load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-bold text-slate-800">職員管理</h1>
        <p className="text-sm text-slate-500 mt-1">
          メールアドレスの登録は不要です。この画面から職員情報を直接登録してください。
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4"
      >
        <h2 className="font-semibold text-slate-700">
          {editing ? "職員を編集" : "職員を追加"}
        </h2>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">氏名</label>
            <input
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="例）山田 花子"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">雇用形態</label>
            <select
              value={form.employment_type}
              onChange={(e) => setForm({ ...form, employment_type: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">役職名</label>
            <select
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">なし</option>
              {POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-2">保有資格</label>
          <div className="flex flex-wrap gap-3">
            {qualifications.map((q) => (
              <label key={q.id} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={form.qualificationIds.includes(q.id)}
                  onChange={(e) => {
                    setForm({
                      ...form,
                      qualificationIds: e.target.checked
                        ? [...form.qualificationIds, q.id]
                        : form.qualificationIds.filter((id) => id !== q.id),
                    });
                  }}
                />
                {q.name}
              </label>
            ))}
          </div>
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
            {saving ? "保存中..." : editing ? "更新する" : "追加する"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-slate-500 px-4 py-2"
            >
              キャンセル
            </button>
          )}
        </div>
      </form>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left px-4 py-2 font-medium">氏名</th>
              <th className="text-left px-4 py-2 font-medium">雇用形態</th>
              <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">役職名</th>
              <th className="text-left px-4 py-2 font-medium hidden md:table-cell">資格</th>
              <th className="text-left px-4 py-2 font-medium">状態</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-6 text-slate-400">
                  読み込み中...
                </td>
              </tr>
            ) : staffList.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-6 text-slate-400">
                  まだ職員が登録されていません
                </td>
              </tr>
            ) : (
              staffList.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{s.full_name}</td>
                  <td className="px-4 py-2 text-slate-500">{s.employment_type ?? "—"}</td>
                  <td className="px-4 py-2 hidden sm:table-cell text-slate-500">
                    {s.position ?? "—"}
                  </td>
                  <td className="px-4 py-2 hidden md:table-cell text-slate-500">
                    {qualifications
                      .filter((q) => s.qualificationIds.includes(q.id))
                      .map((q) => q.name)
                      .join(", ") || "—"}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => toggleActive(s)}
                      className={`text-xs px-2 py-1 rounded-full ${
                        s.active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {s.active ? "在籍中" : "休止中"}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => startEdit(s)}
                      className="text-blue-600 hover:underline mr-3"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
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

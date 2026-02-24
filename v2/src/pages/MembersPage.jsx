import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import { ROLE_LABELS } from "../permissions";

const ROLE_OPTIONS = Object.keys(ROLE_LABELS);

const emptyForm = {
  full_name: "",
  national_id: "",
  email: "",
  phone: "",
  role: "volunteer",
  password: "123456",
  status: "active"
};

export default function MembersPage() {
  const { token, permissions } = useAuth();
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canManage = permissions.canManageTeam === true;

  const filtered = useMemo(() => {
    if (!search) return members;
    const q = search.trim().toLowerCase();
    return members.filter((m) =>
      m.full_name.toLowerCase().includes(q) ||
      m.national_id.includes(q) ||
      m.email.toLowerCase().includes(q)
    );
  }, [members, search]);

  async function loadMembers() {
    setError("");
    try {
      const list = await api.listMembers(token);
      setMembers(list);
    } catch (e) {
      setError(e.message || "تعذر تحميل أعضاء الفريق");
    }
  }

  useEffect(() => {
    loadMembers();
  }, []);

  function startEdit(member) {
    setEditingId(member.id);
    setForm({
      full_name: member.full_name,
      national_id: member.national_id,
      email: member.email,
      phone: member.phone || "",
      role: member.role,
      password: "",
      status: member.status
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function submitForm(e) {
    e.preventDefault();
    if (!canManage) return;
    setLoading(true);
    setError("");
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (editingId) {
        await api.updateMember(token, editingId, payload);
      } else {
        await api.createMember(token, payload);
      }
      resetForm();
      await loadMembers();
    } catch (e) {
      setError(e.message || "فشل حفظ بيانات العضو");
    } finally {
      setLoading(false);
    }
  }

  async function removeMember(memberId) {
    if (!canManage) return;
    const accepted = window.confirm("هل تريد حذف العضو؟");
    if (!accepted) return;
    try {
      await api.deleteMember(token, memberId);
      await loadMembers();
    } catch (e) {
      setError(e.message || "فشل حذف العضو");
    }
  }

  return (
    <section>
      <h2>إدارة الفريق</h2>
      {!canManage && <div className="card">عرض فقط: ليست لديك صلاحية إدارة الفريق.</div>}

      {error && <div className="error-box">{error}</div>}

      {canManage && (
        <form className="card form-grid" onSubmit={submitForm}>
          <h3>{editingId ? "تعديل عضو" : "إضافة عضو جديد"}</h3>

          <label>الاسم</label>
          <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />

          <label>رقم الهوية</label>
          <input value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} required />

          <label>البريد الإلكتروني</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />

          <label>رقم الجوال</label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />

          <label>المنصب</label>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>

          <label>كلمة المرور {editingId ? "(اختياري)" : ""}</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required={!editingId}
          />

          <label>الحالة</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
          </select>

          <div className="row-actions">
            <button className="btn btn-primary" disabled={loading} type="submit">
              {loading ? "جاري الحفظ..." : editingId ? "حفظ التعديلات" : "إضافة عضو"}
            </button>
            {editingId && (
              <button className="btn btn-outline" type="button" onClick={resetForm}>
                إلغاء
              </button>
            )}
          </div>
        </form>
      )}

      <div className="card">
        <div className="table-header">
          <h3>قائمة الأعضاء ({members.length})</h3>
          <input
            className="search-input"
            placeholder="بحث بالاسم أو الهوية أو البريد"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>الهوية</th>
              <th>البريد</th>
              <th>الجوال</th>
              <th>المنصب</th>
              <th>الحالة</th>
              {canManage && <th>إجراءات</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((member) => (
              <tr key={member.id}>
                <td>{member.full_name}</td>
                <td>{member.national_id}</td>
                <td>{member.email}</td>
                <td>{member.phone || "-"}</td>
                <td>{ROLE_LABELS[member.role] || member.role}</td>
                <td>{member.status === "active" ? "نشط" : "غير نشط"}</td>
                {canManage && (
                  <td className="row-actions">
                    <button className="btn btn-outline" onClick={() => startEdit(member)}>تعديل</button>
                    <button className="btn btn-danger" onClick={() => removeMember(member.id)}>حذف</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}


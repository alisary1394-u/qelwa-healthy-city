import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";

const emptyTask = {
  title: "",
  description: "",
  status: "pending",
  priority: "medium",
  due_date: "",
  committee_id: "",
  assigned_member_id: ""
};

export default function TasksPage() {
  const { token, permissions } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [committees, setCommittees] = useState([]);
  const [form, setForm] = useState(emptyTask);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  const canManageTasks = permissions.canManageTasks === true;

  const filtered = useMemo(() => {
    if (filter === "all") return tasks;
    return tasks.filter((task) => task.status === filter);
  }, [tasks, filter]);

  async function loadAll() {
    setError("");
    try {
      const [tasksList, membersList, committeesList] = await Promise.all([
        api.listTasks(token),
        api.listMembers(token),
        api.listCommittees(token)
      ]);
      setTasks(tasksList);
      setMembers(membersList);
      setCommittees(committeesList);
    } catch (e) {
      setError(e.message || "تعذر تحميل بيانات المهام");
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm(emptyTask);
  }

  function startEdit(task) {
    setEditingId(task.id);
    setForm({
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      due_date: task.due_date || "",
      committee_id: task.committee_id ? String(task.committee_id) : "",
      assigned_member_id: task.assigned_member_id ? String(task.assigned_member_id) : ""
    });
  }

  async function submitTask(e) {
    e.preventDefault();
    if (!canManageTasks) return;
    try {
      const payload = {
        ...form,
        committee_id: form.committee_id ? Number(form.committee_id) : null,
        assigned_member_id: form.assigned_member_id ? Number(form.assigned_member_id) : null
      };
      if (editingId) {
        await api.updateTask(token, editingId, payload);
      } else {
        await api.createTask(token, payload);
      }
      resetForm();
      await loadAll();
    } catch (e) {
      setError(e.message || "فشل حفظ المهمة");
    }
  }

  async function removeTask(taskId) {
    if (!canManageTasks) return;
    const accepted = window.confirm("هل تريد حذف المهمة؟");
    if (!accepted) return;
    try {
      await api.deleteTask(token, taskId);
      await loadAll();
    } catch (e) {
      setError(e.message || "فشل حذف المهمة");
    }
  }

  async function quickStatus(task, status) {
    if (!canManageTasks) return;
    try {
      await api.updateTask(token, task.id, { status });
      await loadAll();
    } catch (e) {
      setError(e.message || "فشل تحديث حالة المهمة");
    }
  }

  return (
    <section>
      <h2>إدارة المهام</h2>
      {!canManageTasks && <div className="card">عرض فقط: ليست لديك صلاحية إدارة المهام.</div>}
      {error && <div className="error-box">{error}</div>}

      {canManageTasks && (
        <form className="card form-grid" onSubmit={submitTask}>
          <h3>{editingId ? "تعديل مهمة" : "إضافة مهمة جديدة"}</h3>

          <label>عنوان المهمة</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />

          <label>الوصف</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

          <label>الحالة</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="pending">قيد الانتظار</option>
            <option value="in_progress">قيد التنفيذ</option>
            <option value="completed">مكتملة</option>
            <option value="cancelled">ملغاة</option>
          </select>

          <label>الأولوية</label>
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            <option value="low">منخفضة</option>
            <option value="medium">متوسطة</option>
            <option value="high">عالية</option>
            <option value="urgent">عاجلة</option>
          </select>

          <label>تاريخ الاستحقاق</label>
          <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />

          <label>اللجنة</label>
          <select value={form.committee_id} onChange={(e) => setForm({ ...form, committee_id: e.target.value })}>
            <option value="">بدون لجنة</option>
            {committees.map((committee) => (
              <option key={committee.id} value={committee.id}>{committee.name}</option>
            ))}
          </select>

          <label>تكليف إلى</label>
          <select value={form.assigned_member_id} onChange={(e) => setForm({ ...form, assigned_member_id: e.target.value })}>
            <option value="">بدون تكليف</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>{member.full_name}</option>
            ))}
          </select>

          <div className="row-actions">
            <button className="btn btn-primary" type="submit">{editingId ? "حفظ" : "إضافة مهمة"}</button>
            {editingId && <button className="btn btn-outline" type="button" onClick={resetForm}>إلغاء</button>}
          </div>
        </form>
      )}

      <div className="card">
        <div className="table-header">
          <h3>قائمة المهام ({tasks.length})</h3>
          <select className="search-input" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">كل الحالات</option>
            <option value="pending">قيد الانتظار</option>
            <option value="in_progress">قيد التنفيذ</option>
            <option value="completed">مكتملة</option>
            <option value="cancelled">ملغاة</option>
          </select>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>العنوان</th>
              <th>الحالة</th>
              <th>الأولوية</th>
              <th>المكلف</th>
              <th>اللجنة</th>
              <th>الاستحقاق</th>
              {canManageTasks && <th>إجراءات</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((task) => (
              <tr key={task.id}>
                <td>{task.title}</td>
                <td>{task.status}</td>
                <td>{task.priority}</td>
                <td>{task.assigned_member_name || "-"}</td>
                <td>{task.committee_name || "-"}</td>
                <td>{task.due_date || "-"}</td>
                {canManageTasks && (
                  <td className="row-actions">
                    <button className="btn btn-outline" onClick={() => startEdit(task)}>تعديل</button>
                    {task.status !== "completed" && (
                      <button className="btn btn-outline" onClick={() => quickStatus(task, "completed")}>إنجاز</button>
                    )}
                    <button className="btn btn-danger" onClick={() => removeTask(task.id)}>حذف</button>
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


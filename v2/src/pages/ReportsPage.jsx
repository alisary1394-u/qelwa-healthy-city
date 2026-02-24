import React, { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import { ROLE_LABELS } from "../permissions";

export default function ReportsPage() {
  const { token, permissions } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.getReportSummary(token)
      .then((payload) => {
        if (active) setData(payload);
      })
      .catch((e) => {
        if (active) setError(e.message || "تعذر تحميل التقارير");
      });
    return () => {
      active = false;
    };
  }, [token]);

  if (!permissions.canSeeReports) {
    return <div className="card">غير مصرح لك بعرض التقارير.</div>;
  }

  if (error) return <div className="error-box">{error}</div>;
  if (!data) return <div className="card">جاري تحميل التقارير...</div>;

  return (
    <section>
      <h2>التقارير</h2>
      <div className="cards-grid">
        <article className="card stat-card">
          <strong>{data.summary.membersTotal}</strong>
          <span>إجمالي الفريق</span>
        </article>
        <article className="card stat-card">
          <strong>{data.summary.tasksTotal}</strong>
          <span>إجمالي المهام</span>
        </article>
        <article className="card stat-card">
          <strong>{data.summary.completedTasks}</strong>
          <span>المهام المكتملة</span>
        </article>
      </div>

      <div className="card">
        <h3>توزيع الأعضاء حسب المنصب</h3>
        <table className="table">
          <thead>
            <tr>
              <th>المنصب</th>
              <th>العدد</th>
            </tr>
          </thead>
          <tbody>
            {data.membersByRole.map((row) => (
              <tr key={row.role}>
                <td>{ROLE_LABELS[row.role] || row.role}</td>
                <td>{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>توزيع المهام حسب الحالة</h3>
        <table className="table">
          <thead>
            <tr>
              <th>الحالة</th>
              <th>العدد</th>
            </tr>
          </thead>
          <tbody>
            {data.tasksByStatus.map((row) => (
              <tr key={row.status}>
                <td>{row.status}</td>
                <td>{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}


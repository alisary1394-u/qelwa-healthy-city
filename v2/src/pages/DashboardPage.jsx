import React, { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";

export default function DashboardPage() {
  const { token } = useAuth();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.getReportSummary(token)
      .then((data) => {
        if (active) setSummary(data.summary);
      })
      .catch((e) => {
        if (active) setError(e.message || "تعذر تحميل الملخص");
      });
    return () => {
      active = false;
    };
  }, [token]);

  if (error) return <div className="card error-box">{error}</div>;
  if (!summary) return <div className="card">جاري تحميل لوحة التحكم...</div>;

  const cards = [
    { label: "إجمالي أعضاء الفريق", value: summary.membersTotal },
    { label: "إجمالي المهام", value: summary.tasksTotal },
    { label: "قيد الانتظار", value: summary.pendingTasks },
    { label: "قيد التنفيذ", value: summary.inProgressTasks },
    { label: "مكتملة", value: summary.completedTasks },
    { label: "اللجان", value: summary.committeesTotal }
  ];

  return (
    <section>
      <h2>لوحة التحكم</h2>
      <div className="cards-grid">
        {cards.map((card) => (
          <article key={card.label} className="card stat-card">
            <strong>{card.value}</strong>
            <span>{card.label}</span>
          </article>
        ))}
      </div>
    </section>
  );
}


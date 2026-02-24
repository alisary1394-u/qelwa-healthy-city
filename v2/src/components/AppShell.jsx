import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ROLE_LABELS } from "../permissions";

const NAV_ITEMS = [
  { to: "/dashboard", label: "لوحة التحكم" },
  { to: "/members", label: "الفريق" },
  { to: "/tasks", label: "المهام" },
  { to: "/reports", label: "التقارير" }
];

export default function AppShell({ children }) {
  const { member, logout } = useAuth();

  return (
    <div className="app-shell" dir="rtl">
      <header className="topbar">
        <div>
          <h1>المدينة الصحية - نسخة جديدة (V2)</h1>
          <p className="muted">
            {member?.full_name} — {ROLE_LABELS[member?.role] || member?.role}
          </p>
        </div>
        <button className="btn btn-outline" onClick={logout}>تسجيل الخروج</button>
      </header>

      <div className="content-grid">
        <aside className="sidebar">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              {item.label}
            </NavLink>
          ))}
        </aside>

        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}


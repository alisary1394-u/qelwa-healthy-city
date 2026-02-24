import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import AppShell from "./components/AppShell";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import MembersPage from "./pages/MembersPage";
import TasksPage from "./pages/TasksPage";
import ReportsPage from "./pages/ReportsPage";

function ProtectedLayout() {
  const { member, loading } = useAuth();
  if (loading) return <div className="page-loader">جاري التحقق من الجلسة...</div>;
  if (!member) return <Navigate to="/login" replace />;

  return (
    <AppShell>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  const { member } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={member ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/*" element={<ProtectedLayout />} />
    </Routes>
  );
}

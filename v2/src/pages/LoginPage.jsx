import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, error, setError } = useAuth();
  const [nationalId, setNationalId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login({ national_id: nationalId.trim(), password });
      navigate("/dashboard", { replace: true });
    } catch (e2) {
      setError(e2.message || "تعذر تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page" dir="rtl">
      <form className="card login-card" onSubmit={handleSubmit}>
        <h2>تسجيل الدخول</h2>
        <p className="muted">نسخة تطبيق جديدة كليًا من الصفر</p>

        <label>رقم الهوية</label>
        <input
          value={nationalId}
          onChange={(e) => setNationalId(e.target.value)}
          placeholder="أدخل رقم الهوية"
          required
        />

        <label>كلمة المرور</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="أدخل كلمة المرور"
          required
        />

        {error && <div className="error-box">{error}</div>}

        <button className="btn btn-primary" disabled={loading} type="submit">
          {loading ? "جاري الدخول..." : "دخول"}
        </button>
      </form>
    </div>
  );
}


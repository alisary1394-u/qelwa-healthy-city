import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { getPermissions } from "../permissions";

const STORAGE_TOKEN_KEY = "healthy_city_v2_token";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_TOKEN_KEY) || "");
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadSession() {
      if (!token) {
        if (active) {
          setMember(null);
          setLoading(false);
        }
        return;
      }

      try {
        const result = await api.me(token);
        if (active) {
          setMember(result.member);
          setError("");
        }
      } catch (e) {
        if (active) {
          setToken("");
          setMember(null);
          localStorage.removeItem(STORAGE_TOKEN_KEY);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    setLoading(true);
    loadSession();
    return () => {
      active = false;
    };
  }, [token]);

  async function login(credentials) {
    setError("");
    const result = await api.login(credentials);
    setToken(result.token);
    setMember(result.member);
    localStorage.setItem(STORAGE_TOKEN_KEY, result.token);
    return result;
  }

  async function logout() {
    const oldToken = token;
    setToken("");
    setMember(null);
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    try {
      if (oldToken) await api.logout(oldToken);
    } catch {
      // ignore logout network errors
    }
  }

  const permissions = useMemo(() => getPermissions(member?.role), [member?.role]);

  const value = useMemo(
    () => ({
      token,
      member,
      permissions,
      loading,
      error,
      setError,
      login,
      logout
    }),
    [token, member, permissions, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}


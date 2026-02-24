import { API_BASE_URL } from "./config";

function buildHeaders(token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function request(method, path, { token, body } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: buildHeaders(token),
    body: body ? JSON.stringify(body) : undefined
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

export const api = {
  health: () => request("GET", "/api/health"),
  login: (payload) => request("POST", "/api/auth/login", { body: payload }),
  me: (token) => request("GET", "/api/auth/me", { token }),
  logout: (token) => request("POST", "/api/auth/logout", { token }),

  listMembers: (token) => request("GET", "/api/members", { token }),
  createMember: (token, payload) => request("POST", "/api/members", { token, body: payload }),
  updateMember: (token, id, payload) => request("PATCH", `/api/members/${id}`, { token, body: payload }),
  deleteMember: (token, id) => request("DELETE", `/api/members/${id}`, { token }),

  listCommittees: (token) => request("GET", "/api/committees", { token }),
  createCommittee: (token, payload) => request("POST", "/api/committees", { token, body: payload }),

  listTasks: (token) => request("GET", "/api/tasks", { token }),
  createTask: (token, payload) => request("POST", "/api/tasks", { token, body: payload }),
  updateTask: (token, id, payload) => request("PATCH", `/api/tasks/${id}`, { token, body: payload }),
  deleteTask: (token, id) => request("DELETE", `/api/tasks/${id}`, { token }),

  getReportSummary: (token) => request("GET", "/api/reports/summary", { token })
};


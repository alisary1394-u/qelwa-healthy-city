import express from "express";
import cors from "cors";
import crypto from "crypto";
import { getDb } from "./db.js";
import { getPermissionsByRole, ROLES } from "./permissions.js";

const app = express();
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || "0.0.0.0";

const db = getDb();
const sessions = new Map();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get("/api/health", (_, res) => {
  res.json({ ok: true, app: "healthy-city-v2" });
});

function issueToken() {
  return crypto.randomBytes(24).toString("hex");
}

function authSession(req) {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  return sessions.get(token) || null;
}

function requireAuth(req, res, next) {
  const session = authSession(req);
  if (!session) return res.status(401).json({ error: "غير مسجل الدخول" });
  req.session = session;
  next();
}

function requirePermission(permissionKey) {
  return (req, res, next) => {
    const permissions = getPermissionsByRole(req.session.member.role);
    if (!permissions[permissionKey]) {
      return res.status(403).json({ error: "ليست لديك صلاحية لهذا الإجراء" });
    }
    next();
  };
}

app.post("/api/auth/login", (req, res) => {
  const nationalId = String(req.body?.national_id || "").trim();
  const password = String(req.body?.password || "").trim();
  if (!nationalId || !password) {
    return res.status(400).json({ error: "رقم الهوية وكلمة المرور مطلوبان" });
  }

  const member = db.findMemberByNationalId(nationalId);
  if (!member || member.status !== "active" || member.password !== password) {
    return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
  }

  const safeMember = db.listMembers().find((m) => m.id === member.id);
  const token = issueToken();
  sessions.set(token, { token, member: safeMember, createdAt: Date.now() });
  res.json({ token, member: safeMember, permissions: getPermissionsByRole(safeMember.role) });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ member: req.session.member, permissions: getPermissionsByRole(req.session.member.role) });
});

app.post("/api/auth/logout", requireAuth, (req, res) => {
  sessions.delete(req.session.token);
  res.json({ ok: true });
});

app.get("/api/members", requireAuth, (req, res) => {
  res.json(db.listMembers());
});

app.post("/api/members", requireAuth, requirePermission("canManageTeam"), (req, res) => {
  const payload = req.body || {};
  const fullName = String(payload.full_name || "").trim();
  const nationalId = String(payload.national_id || "").trim();
  const email = String(payload.email || "").trim().toLowerCase();
  const password = String(payload.password || "").trim();
  if (!fullName || !nationalId || !email || !password) {
    return res.status(400).json({ error: "الاسم، الهوية، البريد، وكلمة المرور مطلوبة" });
  }

  try {
    const created = db.createMember(payload);
    return res.status(201).json(created);
  } catch (e) {
    if (e.message === "DUPLICATE_NATIONAL_ID" || e.message === "DUPLICATE_EMAIL") {
      return res.status(409).json({ error: "يوجد عضو بنفس الهوية أو البريد" });
    }
    return res.status(500).json({ error: "فشل إنشاء العضو" });
  }
});

app.patch("/api/members/:id", requireAuth, requirePermission("canManageTeam"), (req, res) => {
  const id = Number(req.params.id);
  try {
    const updated = db.updateMember(id, req.body || {});
    if (!updated) return res.status(404).json({ error: "العضو غير موجود" });
    return res.json(updated);
  } catch (e) {
    if (e.message === "DUPLICATE_NATIONAL_ID" || e.message === "DUPLICATE_EMAIL") {
      return res.status(409).json({ error: "يوجد عضو بنفس الهوية أو البريد" });
    }
    return res.status(500).json({ error: "فشل تحديث العضو" });
  }
});

app.delete("/api/members/:id", requireAuth, requirePermission("canManageTeam"), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.getMemberById(id);
  if (!existing) return res.status(404).json({ error: "العضو غير موجود" });
  if (existing.role === ROLES.GOVERNOR) {
    return res.status(400).json({ error: "لا يمكن حذف حساب المحافظ" });
  }
  db.deleteMember(id);
  return res.status(204).send();
});

app.get("/api/committees", requireAuth, (req, res) => {
  res.json(db.listCommittees());
});

app.post("/api/committees", requireAuth, requirePermission("canManageCommittees"), (req, res) => {
  const payload = req.body || {};
  const name = String(payload.name || "").trim();
  if (!name) return res.status(400).json({ error: "اسم اللجنة مطلوب" });
  try {
    const created = db.createCommittee(payload);
    return res.status(201).json(created);
  } catch (e) {
    if (e.message === "DUPLICATE_COMMITTEE") {
      return res.status(409).json({ error: "اسم اللجنة مستخدم مسبقاً" });
    }
    return res.status(500).json({ error: "فشل إنشاء اللجنة" });
  }
});

app.get("/api/tasks", requireAuth, (req, res) => {
  res.json(db.listTasks());
});

app.post("/api/tasks", requireAuth, requirePermission("canManageTasks"), (req, res) => {
  const payload = req.body || {};
  const title = String(payload.title || "").trim();
  if (!title) return res.status(400).json({ error: "عنوان المهمة مطلوب" });

  const created = db.createTask({
    ...payload,
    created_by_member_id: req.session.member.id
  });
  return res.status(201).json(created);
});

app.patch("/api/tasks/:id", requireAuth, requirePermission("canManageTasks"), (req, res) => {
  const id = Number(req.params.id);
  const updated = db.updateTask(id, req.body || {});
  if (!updated) return res.status(404).json({ error: "المهمة غير موجودة" });
  return res.json(updated);
});

app.delete("/api/tasks/:id", requireAuth, requirePermission("canManageTasks"), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.getTaskById(id);
  if (!existing) return res.status(404).json({ error: "المهمة غير موجودة" });
  db.deleteTask(id);
  return res.status(204).send();
});

app.get("/api/reports/summary", requireAuth, (req, res) => {
  res.json(db.getReportSummary());
});

app.listen(PORT, HOST, () => {
  console.log(`[healthy-city-v2] server listening on ${HOST}:${PORT}`);
});


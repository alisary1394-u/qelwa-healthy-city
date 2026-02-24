import express from "express";
import cors from "cors";
import crypto from "crypto";
import { getDb, getDashboardSummary, mapTaskRow } from "./db.js";
import { getPermissionsByRole, ROLES } from "./permissions.js";

const app = express();
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || "0.0.0.0";

const sessions = new Map();
const db = getDb();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get("/api/health", (_, res) => {
  res.json({ ok: true, app: "healthy-city-v2" });
});

function issueToken() {
  return crypto.randomBytes(24).toString("hex");
}

function sanitizeMember(memberRow) {
  return {
    id: memberRow.id,
    full_name: memberRow.full_name,
    national_id: memberRow.national_id,
    email: memberRow.email,
    phone: memberRow.phone,
    role: memberRow.role,
    status: memberRow.status,
    created_at: memberRow.created_at,
    updated_at: memberRow.updated_at
  };
}

function getAuthSession(req) {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const session = sessions.get(token);
  return session || null;
}

function requireAuth(req, res, next) {
  const session = getAuthSession(req);
  if (!session) return res.status(401).json({ error: "غير مسجل الدخول" });
  req.session = session;
  next();
}

function requirePermission(permissionKey) {
  return (req, res, next) => {
    const role = req.session?.member?.role;
    const permissions = getPermissionsByRole(role);
    if (!permissions[permissionKey]) {
      return res.status(403).json({ error: "ليست لديك صلاحية لهذا الإجراء" });
    }
    next();
  };
}

app.post("/api/auth/login", (req, res) => {
  const nationalId = String(req.body?.national_id || "").trim();
  const password = String(req.body?.password || "");

  if (!nationalId || !password) {
    return res.status(400).json({ error: "رقم الهوية وكلمة المرور مطلوبان" });
  }

  const member = db
    .prepare("SELECT * FROM members WHERE national_id = ? AND status = 'active'")
    .get(nationalId);

  if (!member || member.password !== password) {
    return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
  }

  const token = issueToken();
  const safeMember = sanitizeMember(member);
  sessions.set(token, { token, member: safeMember, createdAt: Date.now() });
  res.json({ token, member: safeMember, permissions: getPermissionsByRole(safeMember.role) });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  const member = req.session.member;
  res.json({ member, permissions: getPermissionsByRole(member.role) });
});

app.post("/api/auth/logout", requireAuth, (req, res) => {
  sessions.delete(req.session.token);
  res.json({ ok: true });
});

app.get("/api/members", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM members ORDER BY id ASC").all();
  res.json(rows.map(sanitizeMember));
});

app.post("/api/members", requireAuth, requirePermission("canManageTeam"), (req, res) => {
  const body = req.body || {};
  const fullName = String(body.full_name || "").trim();
  const nationalId = String(body.national_id || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phone = String(body.phone || "").trim();
  const role = String(body.role || ROLES.VOLUNTEER).trim();
  const password = String(body.password || "").trim();
  const status = body.status === "inactive" ? "inactive" : "active";

  if (!fullName || !nationalId || !email || !password) {
    return res.status(400).json({ error: "الاسم، الهوية، البريد، وكلمة المرور مطلوبة" });
  }

  const createdAt = new Date().toISOString();
  try {
    const result = db.prepare(`
      INSERT INTO members (full_name, national_id, email, phone, role, password, status, created_at, updated_at)
      VALUES (@full_name, @national_id, @email, @phone, @role, @password, @status, @created_at, @updated_at)
    `).run({
      full_name: fullName,
      national_id: nationalId,
      email,
      phone,
      role,
      password,
      status,
      created_at: createdAt,
      updated_at: createdAt
    });
    const inserted = db.prepare("SELECT * FROM members WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json(sanitizeMember(inserted));
  } catch (error) {
    const message = String(error?.message || "");
    if (message.includes("UNIQUE")) {
      return res.status(409).json({ error: "يوجد عضو بنفس الهوية أو البريد" });
    }
    return res.status(500).json({ error: "فشل إنشاء العضو" });
  }
});

app.patch("/api/members/:id", requireAuth, requirePermission("canManageTeam"), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT * FROM members WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "العضو غير موجود" });

  const body = req.body || {};
  const merged = {
    full_name: body.full_name != null ? String(body.full_name).trim() : existing.full_name,
    national_id: body.national_id != null ? String(body.national_id).trim() : existing.national_id,
    email: body.email != null ? String(body.email).trim().toLowerCase() : existing.email,
    phone: body.phone != null ? String(body.phone).trim() : existing.phone,
    role: body.role != null ? String(body.role).trim() : existing.role,
    password: body.password != null && String(body.password).trim() !== "" ? String(body.password).trim() : existing.password,
    status: body.status === "inactive" ? "inactive" : body.status === "active" ? "active" : existing.status,
    updated_at: new Date().toISOString()
  };

  try {
    db.prepare(`
      UPDATE members
      SET full_name = @full_name,
          national_id = @national_id,
          email = @email,
          phone = @phone,
          role = @role,
          password = @password,
          status = @status,
          updated_at = @updated_at
      WHERE id = @id
    `).run({ id, ...merged });
    const updated = db.prepare("SELECT * FROM members WHERE id = ?").get(id);
    res.json(sanitizeMember(updated));
  } catch (error) {
    const message = String(error?.message || "");
    if (message.includes("UNIQUE")) {
      return res.status(409).json({ error: "يوجد عضو بنفس الهوية أو البريد" });
    }
    return res.status(500).json({ error: "فشل تحديث العضو" });
  }
});

app.delete("/api/members/:id", requireAuth, requirePermission("canManageTeam"), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT * FROM members WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "العضو غير موجود" });

  if (existing.role === ROLES.GOVERNOR) {
    return res.status(400).json({ error: "لا يمكن حذف حساب المحافظ" });
  }

  db.prepare("DELETE FROM members WHERE id = ?").run(id);
  res.status(204).send();
});

app.get("/api/committees", requireAuth, (req, res) => {
  const committees = db.prepare("SELECT * FROM committees ORDER BY id ASC").all();
  res.json(committees);
});

app.post("/api/committees", requireAuth, requirePermission("canManageCommittees"), (req, res) => {
  const name = String(req.body?.name || "").trim();
  const description = String(req.body?.description || "").trim();
  if (!name) return res.status(400).json({ error: "اسم اللجنة مطلوب" });

  try {
    const result = db.prepare("INSERT INTO committees (name, description) VALUES (?, ?)").run(name, description);
    const inserted = db.prepare("SELECT * FROM committees WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json(inserted);
  } catch (error) {
    return res.status(409).json({ error: "اسم اللجنة مستخدم مسبقاً" });
  }
});

app.get("/api/tasks", requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT
      t.*,
      c.name AS committee_name,
      m.full_name AS assigned_member_name
    FROM tasks t
    LEFT JOIN committees c ON c.id = t.committee_id
    LEFT JOIN members m ON m.id = t.assigned_member_id
    ORDER BY t.id DESC
  `).all();
  res.json(rows.map(mapTaskRow));
});

app.post("/api/tasks", requireAuth, requirePermission("canManageTasks"), (req, res) => {
  const body = req.body || {};
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const status = ["pending", "in_progress", "completed", "cancelled"].includes(body.status) ? body.status : "pending";
  const priority = ["low", "medium", "high", "urgent"].includes(body.priority) ? body.priority : "medium";
  const dueDate = body.due_date ? String(body.due_date) : null;
  const committeeId = body.committee_id ? Number(body.committee_id) : null;
  const assignedMemberId = body.assigned_member_id ? Number(body.assigned_member_id) : null;
  const now = new Date().toISOString();

  if (!title) return res.status(400).json({ error: "عنوان المهمة مطلوب" });

  const result = db.prepare(`
    INSERT INTO tasks (
      title, description, status, priority, due_date, committee_id, assigned_member_id,
      created_by_member_id, created_at, updated_at
    ) VALUES (
      @title, @description, @status, @priority, @due_date, @committee_id, @assigned_member_id,
      @created_by_member_id, @created_at, @updated_at
    )
  `).run({
    title,
    description,
    status,
    priority,
    due_date: dueDate,
    committee_id: committeeId,
    assigned_member_id: assignedMemberId,
    created_by_member_id: req.session.member.id,
    created_at: now,
    updated_at: now
  });

  const insertedRow = db.prepare(`
    SELECT
      t.*,
      c.name AS committee_name,
      m.full_name AS assigned_member_name
    FROM tasks t
    LEFT JOIN committees c ON c.id = t.committee_id
    LEFT JOIN members m ON m.id = t.assigned_member_id
    WHERE t.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(mapTaskRow(insertedRow));
});

app.patch("/api/tasks/:id", requireAuth, requirePermission("canManageTasks"), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "المهمة غير موجودة" });

  const body = req.body || {};
  const merged = {
    title: body.title != null ? String(body.title).trim() : existing.title,
    description: body.description != null ? String(body.description).trim() : existing.description,
    status: ["pending", "in_progress", "completed", "cancelled"].includes(body.status) ? body.status : existing.status,
    priority: ["low", "medium", "high", "urgent"].includes(body.priority) ? body.priority : existing.priority,
    due_date: body.due_date !== undefined ? (body.due_date ? String(body.due_date) : null) : existing.due_date,
    committee_id: body.committee_id !== undefined ? (body.committee_id ? Number(body.committee_id) : null) : existing.committee_id,
    assigned_member_id: body.assigned_member_id !== undefined ? (body.assigned_member_id ? Number(body.assigned_member_id) : null) : existing.assigned_member_id,
    updated_at: new Date().toISOString()
  };

  db.prepare(`
    UPDATE tasks
    SET title = @title,
        description = @description,
        status = @status,
        priority = @priority,
        due_date = @due_date,
        committee_id = @committee_id,
        assigned_member_id = @assigned_member_id,
        updated_at = @updated_at
    WHERE id = @id
  `).run({ id, ...merged });

  const updated = db.prepare(`
    SELECT
      t.*,
      c.name AS committee_name,
      m.full_name AS assigned_member_name
    FROM tasks t
    LEFT JOIN committees c ON c.id = t.committee_id
    LEFT JOIN members m ON m.id = t.assigned_member_id
    WHERE t.id = ?
  `).get(id);
  res.json(mapTaskRow(updated));
});

app.delete("/api/tasks/:id", requireAuth, requirePermission("canManageTasks"), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT id FROM tasks WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "المهمة غير موجودة" });
  db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
  res.status(204).send();
});

app.get("/api/reports/summary", requireAuth, (req, res) => {
  const summary = getDashboardSummary(db);
  const membersByRole = db.prepare(`
    SELECT role, COUNT(*) AS count
    FROM members
    GROUP BY role
    ORDER BY count DESC
  `).all();
  const tasksByStatus = db.prepare(`
    SELECT status, COUNT(*) AS count
    FROM tasks
    GROUP BY status
    ORDER BY count DESC
  `).all();

  res.json({
    summary,
    membersByRole,
    tasksByStatus
  });
});

app.listen(PORT, HOST, () => {
  console.log(`[healthy-city-v2] server listening on ${HOST}:${PORT}`);
});


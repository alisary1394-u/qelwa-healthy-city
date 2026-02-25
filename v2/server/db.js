import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ROLES } from "./permissions.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = process.env.DB_PATH || path.join(__dirname, "data", "healthy_city_v2.json");

let cache = null;

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function nowIso() {
  return new Date().toISOString();
}

function baseShape() {
  return {
    meta: {
      members: 0,
      committees: 0,
      tasks: 0
    },
    members: [],
    committees: [],
    tasks: []
  };
}

function saveStore(store) {
  ensureDir(DB_FILE);
  const temp = `${DB_FILE}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(store, null, 2), "utf8");
  fs.renameSync(temp, DB_FILE);
}

function loadStore() {
  if (cache) return cache;
  ensureDir(DB_FILE);
  if (!fs.existsSync(DB_FILE)) {
    cache = baseShape();
    seedDefaults(cache);
    saveStore(cache);
    return cache;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    cache = {
      ...baseShape(),
      ...parsed,
      meta: {
        ...baseShape().meta,
        ...(parsed?.meta || {})
      },
      members: Array.isArray(parsed?.members) ? parsed.members : [],
      committees: Array.isArray(parsed?.committees) ? parsed.committees : [],
      tasks: Array.isArray(parsed?.tasks) ? parsed.tasks : []
    };
  } catch {
    cache = baseShape();
  }

  seedDefaults(cache);
  saveStore(cache);
  return cache;
}

function nextId(store, key) {
  const current = Number(store.meta[key] || 0) + 1;
  store.meta[key] = current;
  return current;
}

function seedDefaults(store) {
  if (store.members.length === 0) {
    const ts = nowIso();
    store.members.push({
      id: nextId(store, "members"),
      full_name: "المشرف العام",
      national_id: "1",
      email: "governor@healthycity.local",
      phone: "",
      role: ROLES.GOVERNOR,
      password: "123456",
      status: "active",
      created_at: ts,
      updated_at: ts
    });
    store.members.push({
      id: nextId(store, "members"),
      full_name: "منسق المدينة الصحية",
      national_id: "2",
      email: "coordinator@healthycity.local",
      phone: "0500000001",
      role: ROLES.COORDINATOR,
      password: "123456",
      status: "active",
      created_at: ts,
      updated_at: ts
    });
  }

  if (store.committees.length === 0) {
    store.committees.push(
      { id: nextId(store, "committees"), name: "اللجنة الرئيسية", description: "اللجنة الرئيسية للمدينة الصحية" },
      { id: nextId(store, "committees"), name: "لجنة المشاركة المجتمعية", description: "متابعة المشاركة المجتمعية" },
      { id: nextId(store, "committees"), name: "لجنة الصحة والوقاية", description: "المبادرات الصحية والوقائية" }
    );
  }
}

function sanitizeMember(member) {
  return {
    id: member.id,
    full_name: member.full_name,
    national_id: member.national_id,
    email: member.email,
    phone: member.phone || "",
    role: member.role,
    status: member.status,
    created_at: member.created_at,
    updated_at: member.updated_at
  };
}

function mapTask(store, task) {
  const committee = store.committees.find((c) => c.id === task.committee_id) || null;
  const assigned = store.members.find((m) => m.id === task.assigned_member_id) || null;
  return {
    id: task.id,
    title: task.title,
    description: task.description || "",
    status: task.status,
    priority: task.priority,
    due_date: task.due_date || null,
    committee_id: task.committee_id || null,
    committee_name: committee?.name || null,
    assigned_member_id: task.assigned_member_id || null,
    assigned_member_name: assigned?.full_name || null,
    created_by_member_id: task.created_by_member_id || null,
    created_at: task.created_at,
    updated_at: task.updated_at
  };
}

function makeStoreApi() {
  const store = loadStore();

  return {
    findMemberByNationalId(nationalId) {
      return store.members.find((m) => m.national_id === String(nationalId)) || null;
    },
    getMemberById(id) {
      return store.members.find((m) => m.id === Number(id)) || null;
    },
    listMembers() {
      return store.members.map(sanitizeMember);
    },
    createMember(payload) {
      const national = String(payload.national_id || "").trim();
      const email = String(payload.email || "").trim().toLowerCase();
      if (store.members.some((m) => m.national_id === national)) {
        throw new Error("DUPLICATE_NATIONAL_ID");
      }
      if (store.members.some((m) => m.email === email)) {
        throw new Error("DUPLICATE_EMAIL");
      }
      const ts = nowIso();
      const row = {
        id: nextId(store, "members"),
        full_name: String(payload.full_name || "").trim(),
        national_id: national,
        email,
        phone: String(payload.phone || "").trim(),
        role: String(payload.role || ROLES.VOLUNTEER).trim(),
        password: String(payload.password || ""),
        status: payload.status === "inactive" ? "inactive" : "active",
        created_at: ts,
        updated_at: ts
      };
      store.members.push(row);
      saveStore(store);
      return sanitizeMember(row);
    },
    updateMember(id, patch) {
      const row = store.members.find((m) => m.id === Number(id));
      if (!row) return null;
      const national = patch.national_id != null ? String(patch.national_id).trim() : row.national_id;
      const email = patch.email != null ? String(patch.email).trim().toLowerCase() : row.email;

      if (store.members.some((m) => m.id !== row.id && m.national_id === national)) {
        throw new Error("DUPLICATE_NATIONAL_ID");
      }
      if (store.members.some((m) => m.id !== row.id && m.email === email)) {
        throw new Error("DUPLICATE_EMAIL");
      }

      row.full_name = patch.full_name != null ? String(patch.full_name).trim() : row.full_name;
      row.national_id = national;
      row.email = email;
      row.phone = patch.phone != null ? String(patch.phone).trim() : row.phone;
      row.role = patch.role != null ? String(patch.role).trim() : row.role;
      if (patch.password != null && String(patch.password).trim() !== "") {
        row.password = String(patch.password).trim();
      }
      if (patch.status === "inactive" || patch.status === "active") row.status = patch.status;
      row.updated_at = nowIso();
      saveStore(store);
      return sanitizeMember(row);
    },
    deleteMember(id) {
      const idx = store.members.findIndex((m) => m.id === Number(id));
      if (idx === -1) return null;
      const [removed] = store.members.splice(idx, 1);
      store.tasks.forEach((task) => {
        if (task.assigned_member_id === removed.id) task.assigned_member_id = null;
      });
      saveStore(store);
      return sanitizeMember(removed);
    },

    listCommittees() {
      return store.committees.map((c) => ({ ...c }));
    },
    createCommittee(payload) {
      const name = String(payload.name || "").trim();
      if (store.committees.some((c) => c.name === name)) {
        throw new Error("DUPLICATE_COMMITTEE");
      }
      const row = {
        id: nextId(store, "committees"),
        name,
        description: String(payload.description || "").trim()
      };
      store.committees.push(row);
      saveStore(store);
      return { ...row };
    },

    listTasks() {
      return store.tasks.map((task) => mapTask(store, task)).sort((a, b) => b.id - a.id);
    },
    getTaskById(id) {
      const row = store.tasks.find((t) => t.id === Number(id));
      return row ? mapTask(store, row) : null;
    },
    createTask(payload) {
      const ts = nowIso();
      const row = {
        id: nextId(store, "tasks"),
        title: String(payload.title || "").trim(),
        description: String(payload.description || "").trim(),
        status: payload.status || "pending",
        priority: payload.priority || "medium",
        due_date: payload.due_date || null,
        committee_id: payload.committee_id ? Number(payload.committee_id) : null,
        assigned_member_id: payload.assigned_member_id ? Number(payload.assigned_member_id) : null,
        created_by_member_id: payload.created_by_member_id ? Number(payload.created_by_member_id) : null,
        created_at: ts,
        updated_at: ts
      };
      store.tasks.push(row);
      saveStore(store);
      return mapTask(store, row);
    },
    updateTask(id, patch) {
      const row = store.tasks.find((t) => t.id === Number(id));
      if (!row) return null;
      row.title = patch.title != null ? String(patch.title).trim() : row.title;
      row.description = patch.description != null ? String(patch.description).trim() : row.description;
      row.status = patch.status != null ? patch.status : row.status;
      row.priority = patch.priority != null ? patch.priority : row.priority;
      if (patch.due_date !== undefined) row.due_date = patch.due_date || null;
      if (patch.committee_id !== undefined) row.committee_id = patch.committee_id ? Number(patch.committee_id) : null;
      if (patch.assigned_member_id !== undefined) row.assigned_member_id = patch.assigned_member_id ? Number(patch.assigned_member_id) : null;
      row.updated_at = nowIso();
      saveStore(store);
      return mapTask(store, row);
    },
    deleteTask(id) {
      const idx = store.tasks.findIndex((t) => t.id === Number(id));
      if (idx === -1) return null;
      const [row] = store.tasks.splice(idx, 1);
      saveStore(store);
      return mapTask(store, row);
    },

    getReportSummary() {
      const totalMembers = store.members.length;
      const totalTasks = store.tasks.length;
      const pendingTasks = store.tasks.filter((t) => t.status === "pending").length;
      const inProgressTasks = store.tasks.filter((t) => t.status === "in_progress").length;
      const completedTasks = store.tasks.filter((t) => t.status === "completed").length;
      const committeesTotal = store.committees.length;

      const membersByRoleMap = new Map();
      store.members.forEach((member) => {
        membersByRoleMap.set(member.role, (membersByRoleMap.get(member.role) || 0) + 1);
      });
      const membersByRole = [...membersByRoleMap.entries()]
        .map(([role, count]) => ({ role, count }))
        .sort((a, b) => b.count - a.count);

      const tasksByStatusMap = new Map();
      store.tasks.forEach((task) => {
        tasksByStatusMap.set(task.status, (tasksByStatusMap.get(task.status) || 0) + 1);
      });
      const tasksByStatus = [...tasksByStatusMap.entries()]
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count);

      return {
        summary: {
          membersTotal: totalMembers,
          tasksTotal: totalTasks,
          pendingTasks,
          inProgressTasks,
          completedTasks,
          committeesTotal
        },
        membersByRole,
        tasksByStatus
      };
    }
  };
}

let api = null;

export function getDb() {
  if (!api) api = makeStoreApi();
  return api;
}


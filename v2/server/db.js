import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { ROLES } from "./permissions.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = process.env.DB_PATH || path.join(__dirname, "data", "healthy_city_v2.db");

let db = null;

function nowIso() {
  return new Date().toISOString();
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function getDb() {
  if (db) return db;

  ensureDir(DB_FILE);
  db = new Database(DB_FILE);
  db.pragma("journal_mode = WAL");
  bootstrap(db);
  return db;
}

function bootstrap(connection) {
  connection.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      national_id TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      phone TEXT DEFAULT '',
      role TEXT NOT NULL,
      password TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS committees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      priority TEXT NOT NULL DEFAULT 'medium',
      due_date TEXT,
      committee_id INTEGER,
      assigned_member_id INTEGER,
      created_by_member_id INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (committee_id) REFERENCES committees(id),
      FOREIGN KEY (assigned_member_id) REFERENCES members(id),
      FOREIGN KEY (created_by_member_id) REFERENCES members(id)
    );
  `);

  seedDefaults(connection);
}

function seedDefaults(connection) {
  const hasMembers = connection.prepare("SELECT COUNT(*) AS c FROM members").get().c > 0;
  if (!hasMembers) {
    const insertMember = connection.prepare(`
      INSERT INTO members (full_name, national_id, email, phone, role, password, status, created_at, updated_at)
      VALUES (@full_name, @national_id, @email, @phone, @role, @password, @status, @created_at, @updated_at)
    `);

    const ts = nowIso();
    insertMember.run({
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
    insertMember.run({
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

  const hasCommittees = connection.prepare("SELECT COUNT(*) AS c FROM committees").get().c > 0;
  if (!hasCommittees) {
    const committees = [
      { name: "اللجنة الرئيسية", description: "اللجنة الرئيسية للمدينة الصحية" },
      { name: "لجنة المشاركة المجتمعية", description: "متابعة المشاركة المجتمعية" },
      { name: "لجنة الصحة والوقاية", description: "المبادرات الصحية والوقائية" }
    ];
    const insertCommittee = connection.prepare("INSERT INTO committees (name, description) VALUES (@name, @description)");
    committees.forEach((c) => insertCommittee.run(c));
  }
}

export function mapTaskRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    due_date: row.due_date,
    committee_id: row.committee_id,
    committee_name: row.committee_name,
    assigned_member_id: row.assigned_member_id,
    assigned_member_name: row.assigned_member_name,
    created_by_member_id: row.created_by_member_id,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export function getDashboardSummary(connection = getDb()) {
  const membersTotal = connection.prepare("SELECT COUNT(*) AS c FROM members").get().c;
  const tasksTotal = connection.prepare("SELECT COUNT(*) AS c FROM tasks").get().c;
  const pendingTasks = connection.prepare("SELECT COUNT(*) AS c FROM tasks WHERE status = 'pending'").get().c;
  const inProgressTasks = connection.prepare("SELECT COUNT(*) AS c FROM tasks WHERE status = 'in_progress'").get().c;
  const completedTasks = connection.prepare("SELECT COUNT(*) AS c FROM tasks WHERE status = 'completed'").get().c;
  const committeesTotal = connection.prepare("SELECT COUNT(*) AS c FROM committees").get().c;

  return {
    membersTotal,
    tasksTotal,
    pendingTasks,
    inProgressTasks,
    completedTasks,
    committeesTotal
  };
}


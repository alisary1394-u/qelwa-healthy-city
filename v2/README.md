# Healthy City V2 (Fresh Rewrite)

This is a brand-new rewrite built from scratch in a separate `v2` folder.

## Stack

- Frontend: React + Vite
- Backend: Express + SQLite (`better-sqlite3`)
- Authentication: Token-based session (simple server memory session store)
- Permissions: Role-based access matrix

## Core Features

- Login by `national_id` + `password`
- Team management (list/create/update/delete)
- Tasks management (list/create/update/delete + quick complete)
- Committees list/create
- Summary reports (team/task distribution)

## Run Locally

### 1) Backend

```bash
cd v2/server
npm install
npm run dev
```

Server runs on `http://localhost:8080`.

### 2) Frontend

```bash
cd v2
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and calls `http://localhost:8080` by default.

## Environment Variables

Frontend (`v2/.env.local`):

```env
VITE_API_URL=http://localhost:8080
```

Backend (`v2/server`):

```env
PORT=8080
HOST=0.0.0.0
DB_PATH=./data/healthy_city_v2.json
```

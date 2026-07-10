# Smart Citizen Feedback and Complaint Management System

Full-stack React + Node.js + Express project for the SCFCMS academic prototype. The system supports complaint intake, automatic routing, status tracking, staff response, escalation, closure, satisfaction rating, reports, and audit trail, enforced through a 3-role RBAC model (Citizen, Administrative Staff, Admin) on both the API and the frontend.

## Main Demo Workflows

- Citizen: register, log in, submit a complaint or feedback with an optional file attachment, receive a tracking number, view the assigned office, track status, receive notifications, rate resolved complaints, and manage their profile.
- Administrative Staff: view cases assigned to their office, update status, write official responses, resolve/close cases, and escalate unresolved or sensitive cases.
- Admin: manage users (create, edit role/status, delete), complaint categories and SLAs, routing rules, view reports/analytics, and review audit logs.

## Run Locally

```bash
npm install
npm run install:all
npm run dev
```

Frontend: `http://localhost:5173`

Backend API: `http://localhost:5001/api` (see `backend/.env`, `PORT`)

MySQL must be running (this project was developed against XAMPP's MySQL on `localhost:3306`, user `root`, empty password). The backend creates the configured database, synchronizes tables, and seeds SCFCMS users, complaint categories, offices, routing rules, complaints, responses, notifications, ratings, and audit logs.

## Demo Login Accounts

All demo accounts use password `password`.

| Role | Email |
| --- | --- |
| Citizen | `jean@smartcitizen.rw` |
| Administrative Staff | `staff@smartcitizen.rw` |
| Admin | `admin@smartcitizen.rw` |

## Important URLs

- Citizen dashboard: `http://localhost:5173/app/dashboard`
- Submit complaint: `http://localhost:5173/app/submit-complaint`
- My complaints: `http://localhost:5173/app/complaints`
- Citizen profile: `http://localhost:5173/app/profile`
- Staff assigned cases: `http://localhost:5173/staff/cases`
- Admin users: `http://localhost:5173/admin/users`
- Admin routing rules: `http://localhost:5173/admin/routing`
- Admin reports: `http://localhost:5173/admin/reports`

## Backend Environment

Copy `backend/.env.example` to `backend/.env` when you want custom ports, JWT secret, MySQL credentials, or API keys. `PORT` defaults to `5001` in this environment because `5000` was already in use by another local project.

The platform uses no frontend mock fallback data. If the backend or database is unavailable, the issue will appear during testing instead of being hidden by local fake data.

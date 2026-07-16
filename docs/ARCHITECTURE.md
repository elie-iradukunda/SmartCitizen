# Smart Citizen Architecture

## Frontend

- React + Vite.
- Role-based dashboards for citizen, administrative staff, and admin.
- Axios client attaches JWT tokens from local storage.
- Reports can be printed in-browser or downloaded from the API.

## Backend

- Node.js + Express.
- Sequelize models for users, offices, routing rules, complaints, responses, ratings, notifications, audit logs, and counters.
- JWT authentication with role middleware.
- Multer handles evidence uploads with size/type limits.
- SLA auto-escalation runs on a schedule from `backend/src/server.js`.
- Optional SMTP email and Twilio SMS notifications are handled by `notificationService`.

## Database

- MySQL/MariaDB.
- The canonical schema is `database/schema.sql`.
- Local Docker MySQL is provided in `docker-compose.yml`.

## Core complaint flow

1. Citizen submits complaint.
2. Backend detects or receives category.
3. Routing rule assigns responsible office and SLA due date.
4. Staff updates status and writes official responses.
5. SLA check escalates overdue cases.
6. Citizen rates resolved case.
7. High rating closes case; low rating escalates it.
8. Audit log records important actions.

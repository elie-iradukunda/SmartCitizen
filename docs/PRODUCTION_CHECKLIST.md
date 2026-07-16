# Smart Citizen Production Checklist

## Required before deployment

- Use MySQL from Docker, Railway, or another managed service instead of a damaged local XAMPP data folder.
- Set a strong `JWT_SECRET`.
- Set `PUBLIC_APP_URL` to the deployed frontend URL.
- Set `CLIENT_URL` to the deployed frontend URL.
- Configure HTTPS at the hosting layer.
- Configure daily MySQL backups and test restore.
- Configure `SMTP_*` variables for real password reset and email notifications.
- Configure `TWILIO_*` variables if SMS notifications are required.
- Keep `DB_SYNC=false` after the production schema is stable and use migrations/backups for changes.
- Store uploads outside the repo with `UPLOAD_DIR`.
- Set `MAX_UPLOAD_MB` to the largest evidence size the institution accepts.
- Monitor backend logs for failed email/SMS notifications, failed SLA checks, and database errors.

## Useful commands

```bash
npm install
npm run install:all
npm test
npm run build
npm run dev
```

Run the API integration workflow after the dev server is up:

```bash
npm run test:api
```

## Docker database

```bash
docker compose up -d mysql
```

Then set:

```env
DB_HOST=127.0.0.1
DB_PORT=3307
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3307
```

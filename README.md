# ASA Elections · Augustana University

Voting platform for the **Augustana Student Association (ASA)** and other Augustana University organizations.
Students vote in elections they are eligible for (e.g. ASA class senators: each class votes only for its own seat).

> Status: in development. Not yet reviewed or approved for real elections.

**Stack:** React + TypeScript + Tailwind (client) · Node + Express + TypeScript (server) · PostgreSQL + Prisma.
Design and decisions: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Local development

Prerequisites: Node 22+, Docker Desktop.

```bash
npm install

# 1. Database (local Docker container on port 5433)
#    Create a root .env containing:  POSTGRES_PASSWORD=<any long random string>
docker compose up -d

# 2. Server config
cp .env.example server/.env     # then fill in SESSION_SECRET and the password in both database URLs

# 3. Create tables and load FAKE sample data
cd server && npx prisma migrate dev && npm run db:seed && cd ..

# 4. Run (two terminals)
npm run dev:server   # API on http://localhost:3000
npm run dev:client   # Website on http://localhost:5173
```

Sign in at `/login` using the development picker (e.g. `fr.student1`, `sr.student1`, `admin`).
Real university login will replace it before launch.

## Useful commands

| Command | What it does |
|---|---|
| `npm test` | Server + client tests |
| `npm run typecheck` | Type-check all workspaces |
| `cd server && npx prisma migrate reset` | Wipe the dev database, re-apply migrations, re-seed |
| `cd server && npm run db:studio` | Browse the dev database |

## Data safety

Never commit real student data or `.env` files. The roster import (coming next) parses files in memory and does not store them.

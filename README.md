# thesis-web

Web application for a **football analytics** thesis project (graduation work at IU). It is an [Express](https://expressjs.com/) server written in **TypeScript**, with **EJS** templates for the UI and **MySQL** for persistence via **Prisma** (and a small amount of raw SQL through `mysql2`).

Related repository context: [football-analytics-thesis-project](https://github.com/Tudu-Pham/football-analytics-thesis-project).

## Features

- Public pages: home, sign-up, sign-in, forgot password (email verification code), main analytics entry, profile
- **Forgot password:** requests a **4-digit** code by email; the code entry page uses a **segmented OTP** UI (one digit per box), not a single text field
- Admin area: dashboard (user list), per-user view, matches view, delete user
- Optional first-run seeding of default users when the database is empty (see `src/config/seed.ts`)

## Prerequisites

- **Node.js** (LTS recommended)
- **MySQL** with a database you can point Prisma at (the sample code historically uses a database named `footballanalytics`; align your `DATABASE_URL` and `src/config/database.ts` with your own instance)

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env` and set at least:

   - `DATABASE_URL` — MySQL connection string for Prisma, e.g.  
     `mysql://USER:PASSWORD@localhost:3306/footballanalytics`
   - `PORT` (optional) — defaults to `3000` if unset
   - `SESSION_SECRET` — random string for signed cookies (required in production)
   - **SMTP** (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, …) — used to send verification and password emails for forgot-password. If `SMTP_HOST` is empty in development, the app may log messages instead of sending mail (see `src/services/mail.service.ts`)

3. **Database schema**

   Apply migrations and generate the Prisma client:

   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

   For local development you can use `npx prisma migrate dev` instead of `deploy` when you need to create or adjust migrations.

4. **MySQL connection used for raw queries**

   User lookup by ID uses `mysql2` in `src/config/database.ts` with host/user/password/database values that must match your MySQL instance (or refactor that file to read from environment variables so it stays in sync with `DATABASE_URL`).

## Run

```bash
npm run dev
```

Or:

```bash
npm start
```

Both use **nodemon** and run `src/app.ts` through **ts-node** (see `package.json` / `nodemonConfig`).

Debug (Node inspector on port 9229):

```bash
npm run start:debug
```

Then open `http://localhost:3000` (or your configured `PORT`).

## Project layout

| Path | Role |
|------|------|
| `src/app.ts` | Express app, middleware, routes, startup |
| `src/routes/web.ts` | HTTP route map |
| `src/controllers/` | Request handlers |
| `src/services/` | Business logic and DB access |
| `src/config/client.ts` | Shared `PrismaClient` instance |
| `src/config/database.ts` | `mysql2` connection for raw SQL |
| `src/config/seed.ts` | Seeds default users if the `users` table is empty |
| `src/views/` | EJS templates (client + admin) |
| `public/` | Static assets (CSS, images, client JS; e.g. `javascripts/forgot-password-code.js` for OTP UI) |
| `prisma/` | Schema and migrations |

## Routes (overview)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Home |
| GET/POST | `/createUser` | Sign-up form |
| GET/POST | `/signin` | Sign-in |
| GET | `/logout` | Sign out |
| GET/POST | `/forgot-password` | Request reset code (email) |
| GET/POST | `/forgot-password/code` | Enter 4-digit code (segmented OTP UI), reset password |
| GET | `/football-analytics` | Main client page (authenticated) |
| GET | `/detail-match` | Match detail (authenticated) |
| GET/POST | `/profile` | Profile view and update (authenticated) |
| GET | `/admin` | Admin dashboard |
| GET | `/view-user/:id` | Admin user detail |
| GET | `/matches` | Admin matches |
| POST | `/delete-user/:id` | Delete user (admin) |

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` / `npm start` | Development server with nodemon |
| `npm run start:debug` | Same with Node `--inspect` |
| `npm test` | Placeholder (not implemented) |

## License

ISC — see `package.json`.

## Author

Pham Trung Dung — ITITIU21007

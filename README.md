# School Fee Collection System

Internal fee-collection, student-records and expense tool for a school. Two roles: **Admin** (one,
seeded) and **Manager** (created by Admin). Next.js 14 (App Router) + Tailwind + Prisma + Supabase
Postgres, with our own JWT auth (no third-party auth provider).

## Login credentials (seeded — development only)

| Role    | Username   | Password     | Name        |
| ------- | ---------- | ------------ | ----------- |
| Admin   | `admin`    | `admin123`   | Admin       |
| Manager | `manager1` | `manager123` | Bilal Ahmed |
| Manager | `manager2` | `manager123` | Sana Tariq  |
| Manager | `manager3` | `manager123` | Imran Shah  |

`admin`, `manager1` and `manager2` come from `prisma/seed.ts`; `manager3` was created by the Admin
through **Managers → Add manager** (the normal way to add staff). All are stored bcrypt-hashed in the
`users` table. **Change them before real use.**

> The Supabase **database password** is deliberately *not* written here — this file is committed to
> git. It lives only in `.env` (git-ignored). Get or reset it at Supabase Dashboard → Connect →
> **Reset database password**.

## Setup

1. **Environment** — copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` — Supabase **Transaction pooler** URI (port 6543), keep `?pgbouncer=true&connection_limit=5` (connections per app process — 1 makes pages with several queries time out on a long-running server)
   - `DIRECT_URL` — Supabase **Session pooler** URI (same host, port 5432), used for migrations
   - `AUTH_SECRET` — random string that signs the session cookie:
     `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

   Notes:
   - Don't use the `db.<project>.supabase.co` "Direct connection" host on an IPv4-only network — it is IPv6-only. The pooler hosts work over IPv4.
   - If the DB password has special characters, percent-encode them in both URLs (e.g. `@` → `%40`).

2. **Install** — `npm install`
3. **Create tables** — `npm run prisma:push` (runs `prisma migrate dev`)
4. **Seed demo data** — `npm run prisma:seed` (safe to re-run; demo rows are only added to an empty DB)
5. **Run** — `npm run dev`, then open http://localhost:3000

Check the DB connection at http://localhost:3000/api/health — `"db": "connected"` plus row counts.

## Auth

- `POST /api/auth/login` — `{ username, password }` → sets an httpOnly `session` cookie (JWT, 12 h) and returns `redirectTo` (`/admin` or `/manager`).
- `POST /api/auth/logout` — clears the cookie.
- `POST /api/payments` — Manager only. `{ studentId, feeType, forMonth?, amount, notes? }` → records a fee payment with `collectedById` = the signed-in manager (never taken from the request). `forMonth` (`YYYY-MM`) is required for monthly fees, up to 12 months ahead.
- `POST /api/manager/submissions` — Manager only. `{ amount, notes? }` → hand-over to Admin, always created `PENDING`. Rejected if more than the manager's cash in hand.
- `POST /api/admin/submissions/:id/confirm` — Admin only. `PENDING → CONFIRMED` (atomic; a second confirm returns 409).
- `POST /api/admin/expenses`, `PATCH|DELETE /api/admin/expenses/:id` — Admin only. Category is one of Utilities, Salary, Supplies, Maintenance, Other.
- `POST /api/admin/managers` — Admin only. `{ name, username, password, phone? }` → creates a `MANAGER` user (username lowercased, must be unique, password bcrypt-hashed). 409 if the username is taken.
- `middleware.ts` guards `/admin/*`, `/api/admin/*` (Admin only) and `/manager/*`, `/api/manager/*`, `/api/payments` (Manager only). Wrong role → sent to own dashboard; no/invalid session → `/login` (pages) or 401/403 JSON (API).

## Students

Required fields: **name, father's name, class, phone number, monthly fee**. Admission fee and
admission date are optional. **Class is free text** (e.g. `Class 5`, `Nursery`, `8-B`) — trimmed and
inner spaces collapsed so `Class  5` and `Class 5` are the same, max 50 characters. All create/edit/import
paths validate through `lib/studentInput.ts`.

### Bulk import (Admin → Students → Import students)

- Upload `.csv` or `.xlsx` (parsed with SheetJS 0.20.3, installed from the official SheetJS CDN —
  the npm-registry `xlsx` package is abandoned and has known vulnerabilities).
- Columns: `name, father_name, class, phone_number, monthly_fee, admission_fee` (admission_fee may be blank).
  **Download Template** gives the exact header plus an example row.
- Every row is validated first and shown in a preview; invalid rows are highlighted with the reason.
- **Confirm Import** re-parses the same file on the server and inserts only valid rows in one transaction.
- Rows whose name + father's name already exist (in the DB or earlier in the same file) are skipped,
  so importing the same file twice never creates duplicates.
- Excel phone numbers that lost their leading 0 (`3001234567`) are restored (`03001234567`).

## How dues are calculated (`lib/calculations.ts` → `getStudentBalance`)

```
owed    = (admissionFee ?? 0) + monthlyFee × monthsBilled
paid    = sum of the student's fee_payments.amount
due     = owed − paid          (negative = paid in advance)
```

- **monthsBilled counts the admission month and the current month** (admitted 15 Sept, today 2 Oct → 2).
- Months use school time (**Asia/Karachi**), not the server's clock.
- No admission date → billing starts from the date the student was added.
- Marked **Left** → billing stops at the month they left (`leftAt`). Students are never deleted.
- Uses the student's *current* monthly fee for every month, so a fee change re-prices past months too.

## Look & feel

- **Three colours:** black, white and **emerald** (buttons, active menu item, links, charts), with
  **red reserved for warnings only** (money owed, flagged managers, errors). Tokens live in
  `app/globals.css` (RGB channels, so `bg-accent/10` works) and are mapped in `tailwind.config.ts`.
- Every text/background pair is ≥ 4.5:1 in both themes; chart colours were checked with a
  colour-blind-safety validator (emerald + neutral grey).
- **Charts** (`components/charts/`): `AreaChart` (smooth trend, gradient fill, hover crosshair,
  ←/→ keys) and `ColumnChart` (one or two series, e.g. collected vs expenses). Both include a
  "Show as table" view for exact values.

## Admin reporting

- **Dashboard** — collected today / this month / all-time, expenses, net, outstanding dues, and
  **cash with managers**: collected − submitted per manager.
- **Reconciliation flags** (`lib/reconciliation.ts`): a manager is flagged red when **Rs 50,000+**
  is still with them, or any of it has been held **3+ days**. "Holding since" assumes submissions hand
  over the oldest cash first. Change `LARGE_HOLDING` / `OLD_HOLDING_DAYS` to tune.
- **Reports** — every fee payment, filterable by date range, manager and student in any combination
  (filters live in the URL, so a filtered view can be bookmarked or shared).
- **Manager detail** (`/admin/managers/:id`) — reconciliation (all-time or a date range) and
  collection trend by day (30), week (12, Monday start) and month (12).
- **Expenses** — filter by date range + category; filtered total plus fixed this-month / this-year totals.

## Project layout

```
app/
  login/            sign-in page + form
  admin/            Admin area
  manager/          Manager area
  api/auth/         login / logout
  api/health/       DB connection check
components/         shared UI
lib/
  auth.ts           signIn(), getSession()
  session.ts        JWT sign/verify (edge-safe, used by middleware)
  prisma.ts         Prisma client singleton
  calculations.ts   dues maths: getStudentBalance() → { owed, paid, due }
  time.ts           school-time (Asia/Karachi) month/day helpers
  stats.ts          per-manager totals: today / this month / submitted / cash in hand
  expenseInput.ts   expense validation + fixed category list
  reconciliation.ts collected vs submitted per manager + flags
  reports.ts        day / week / month buckets for trend charts
  presets.ts        "This month / Last month / This year" filter shortcuts
  studentInput.ts   student validation (shared by edit + import)
  studentImport.ts  CSV/XLSX parsing, template, duplicate checks
middleware.ts       role-based route protection
prisma/
  schema.prisma     5 tables: users, students, fee_payments, submissions, expenses
  seed.ts           demo data
```

## Useful commands

| Command                 | What it does                               |
| ----------------------- | ------------------------------------------ |
| `npm run dev`           | Start dev server                           |
| `npm run lint`          | ESLint                                     |
| `npm run prisma:push`   | Apply schema changes as a migration        |
| `npm run prisma:seed`   | Seed demo data                             |
| `npm run prisma:studio` | Browse the DB in the browser               |

On Windows, stop `npm run dev` before running `prisma generate` / migrations after a schema change —
the dev server locks Prisma's engine file (`EPERM` error otherwise).

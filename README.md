# School Fee Collection System

Internal fee-collection, student-records and expense tool for a school. Two roles: **Admin** (one,
seeded) and **Manager** (created by Admin). Next.js 14 (App Router) + Tailwind + Prisma + Supabase
Postgres, with our own JWT auth (no third-party auth provider).

## Campuses

Three **fully separate** campuses share one database; every record carries a `campusId` and every
query is scoped to the signed-in user's campus (`lib/scope.ts`, `lib/auth.ts#getActor`). An admin or
manager never sees another campus's students, payments, submissions, expenses or managers — a
request using another campus's id is answered as "not found".

| Campus | Admin login |
| --- | --- |
| Al-Abbas Boys Higher Secondary School Shah Jamal | `admin` / `admin123` |
| Al-Abbas Girls Higher Secondary School Shah Jamal | `admin.girls` / `admin123` |
| Al-Abbas Kids Grammar Public School | `admin.kids` / `admin123` |

Each campus admin creates their own managers (**Managers → Add manager**). Demo managers (Boys campus):
`manager1` / `manager123` (Bilal Ahmed), `manager2` / `manager123` (Sana Tariq), `manager3` / `manager123` (Imran Shah).
Usernames are unique across all campuses, so there is one login page. **Change these passwords before real use.**

> The database password is deliberately *not* written here — this file is committed to git.

**Managers who leave:** Admin → Managers → **Deactivate**. They can't log in (an open session stops
working immediately) and every payment, submission and expense they recorded stays in all reports.
Delete is only possible for a manager with no records at all.

## Paper Fund

Decided **month by month per campus** (Admin → **Paper Fund**): one amount for every student in that
campus for that month. Once set, every student billed that month owes it; unpaid PF keeps showing as
**PF due**. Until a month is set, it owes nothing and shows "PF not set yet". Managers can take it
with the monthly fee (**Monthly + PF**, saved as two rows in one transaction) or on its own.

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

## Who can do what

| Action | Admin | Manager |
| --- | --- | --- |
| Add students (one by one or bulk import) | ✅ | ✅ |
| Edit a student / mark Left | ✅ | — |
| Delete a student | ✅ only if they have **no payments** (otherwise mark Left) | — |
| Record fee payments | — | ✅ |
| Submit cash to Admin / confirm it | confirms | submits |
| Record an expense paid from collected cash | — | ✅ (needs Admin approval) |
| Add / edit / delete school expenses, approve or reject manager expenses | ✅ | — |

**A manager's cash in hand** = everything they collected − everything they submitted − their
expenses (pending or approved). Earlier days' leftover always carries forward, and the Submit page
shows the breakdown. A **rejected** expense goes back into cash in hand (they still owe it). Only
**approved** expenses count in school-wide expense totals.

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

## Database, backups and failover

- **Live DB:** PostgreSQL 18 **on the app server**, listening on 127.0.0.1 only (never exposed).
- **Backup copy:** `db-backup.timer` runs every **15 min**: dumps the live DB to
  `/var/backups/school-fee/` (daily copies kept 14 days) and restores it into **Supabase** (Seoul) in a
  single transaction. `/api/health` → `backup.status` becomes `stale` if the last success is > 1 h old.
  `scripts/deploy.sh` also takes a `pre-deploy-*.dump` before every migration.
- **If the server dies:** Supabase holds a copy at most ~15 min old. On a new server, set
  `DATABASE_URL`/`DIRECT_URL` to the Supabase URL (kept as `BACKUP_DATABASE_URL` in the server `.env`,
  add `?pgbouncer=true&connection_limit=5` for the 6543 pooler), deploy, and it runs. To move back to a
  local DB: `pg_dump` Supabase → `pg_restore` into the new local Postgres → switch the URLs back.
- **Local development** uses the separate Supabase schema **`dev`** (`?schema=dev` in the local
  `.env`). Never point development at `public` — that's the production backup and is overwritten.

## Production server

Live at **https://16.112.153.201** (AWS EC2, Ubuntu 26.04, ap-south-2).

| Piece | Where |
| --- | --- |
| App code | `/srv/school-fee-system` (owned by the `feeapp` system user) |
| Secrets | `/srv/school-fee-system/.env` — mode 600, readable only by `feeapp`; not in git |
| Database | PostgreSQL 18 on this server (127.0.0.1:5432, db `schoolfee`); backup timer `db-backup.timer` |
| App process | systemd `school-fee.service` → `next start` on **127.0.0.1:3000** (not reachable from outside) |
| Web server | nginx → `/etc/nginx/sites-available/school-fee` (HTTP → HTTPS redirect, gzip, security headers) |
| HTTPS | Let's Encrypt **IP certificate** (short-lived, ~6 days) via certbot in `/opt/certbot`; renewed by `certbot-renew.timer` twice a day |

**Deploy an update** (after pushing to `main`):

```bash
ssh -i feesystem.pem ubuntu@16.112.153.201
sudo bash /srv/school-fee-system/scripts/deploy.sh
```

Useful commands on the server: `systemctl status school-fee`, `journalctl -u school-fee -f` (live logs),
`systemctl list-timers certbot-renew.timer`, `sudo certbot certificates`.


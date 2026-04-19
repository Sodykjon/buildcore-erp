# BuildCore ERP

Multi-store construction materials ERP — Next.js 16 + Supabase + Prisma 7 + Tailwind CSS 4.

## Features

- **5-store inventory** with per-store stock tracking and real-time global view
- **POS** optimized for HID barcode scanners (no click required)
- **Partial pickups** — pay for 100 bags, collect 20 today, track the balance
- **Inter-store transfers** — Request → Approve → Ship → Receive lifecycle
- **Code 128 barcodes** auto-generated on product creation
- **Thermal label printing** at 2×1 inch via `@media print`
- **Loyalty points** ledger (toggleable)
- **RBAC** — Admin / Warehouse Manager / Staff with Supabase RLS
- **Offline resilience** — React Query caches last-seen data for Wi-Fi dips
- **Low stock alerts** via PostgreSQL trigger → dashboard banner

## Quick Start

### 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Copy your Project URL and anon key from **Project Settings → API**
3. Copy your database password from **Project Settings → Database**

### 2. Configure environment

```bash
cp .env.example .env
# Fill in your Supabase credentials in .env
```

### 3. Push schema to database

```bash
npm run db:push
```

### 4. Run SQL migrations

In the Supabase dashboard → **SQL Editor**, run these files in order:
1. `supabase/migrations/001_rls_policies.sql`
2. `supabase/migrations/002_global_stock_view.sql`
3. `supabase/migrations/003_triggers.sql`

### 5. Seed initial data

Create your first store and admin user via Supabase Auth → **Authentication → Users**,
then insert a matching `profiles` row with `role = 'ADMIN'`.

### 6. Start development

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) — it redirects to `/login`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run db:push` | Push schema to Supabase (no migration file) |
| `npm run db:migrate` | Create and apply a named migration |
| `npm run db:studio` | Open Prisma Studio |

## Route Structure

| Path | Role | Description |
|---|---|---|
| `/login` | All | Authentication |
| `/admin` | Admin | Multi-store dashboard |
| `/admin/inventory` | Admin | Product & stock management |
| `/admin/transfers` | Admin | Inter-store transfer list |
| `/admin/orders` | Admin | All orders across stores |
| `/admin/inventory/[id]/label?copies=N` | Admin | Thermal label print page |
| `/pos` | Staff | Barcode scanner POS |
| `/warehouse/fulfillment` | Manager | Partial pickup processing |

## Barcode Scanning

The POS captures keystrokes globally — the cashier never needs to click a field.
Point any HID barcode scanner at the screen and scan. The system detects the burst
(characters arriving faster than human typing) and resolves the product from cache.

## Thermal Labels

Navigate to `/admin/inventory/[productId]/label?copies=3` and the browser
will auto-trigger `window.print()`. Set your thermal printer as default and
configure it to use 2×1 inch label stock.

## Stack

- **Next.js 16** — App Router, Server Actions, ISR
- **Supabase** — Auth, PostgreSQL, Row-Level Security, pg_cron
- **Prisma 7** — ORM with transaction support
- **Tailwind CSS 4** — Styling
- **@tanstack/react-query 5** — Client caching + offline resilience
- **jsbarcode** — Code 128 barcode rendering
- **lucide-react** — Icons

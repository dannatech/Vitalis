# Vitalis

An Electronic Health Record (EHR) system built for African hospitals, with a first-class
compliance target of **Nigerian healthcare regulation**: the Nigeria Data Protection
Regulation (NDPR/NDPA 2023), NHIS/NHIA guidelines, and NCDC notifiable disease (IDSR)
reporting. Designed offline-first for facilities with unreliable connectivity.

See [`COMPLIANCE.md`](./COMPLIANCE.md) for how the regulatory requirements map to the code.

## Architecture

```
Vitalis/
├── backend/     NestJS + Prisma + PostgreSQL REST API
└── frontend/    React + Vite PWA, offline-first (IndexedDB via Dexie.js)
```

- **Backend**: NestJS (TypeScript), PostgreSQL via Prisma ORM, JWT auth with RBAC,
  field-level encryption for sensitive PII (NIN, phone), append-only audit log,
  NDPR consent & data-subject-request module, offline sync endpoints.
- **Frontend**: React PWA that keeps a local IndexedDB cache/outbox so registration
  and clinical documentation keep working when connectivity drops, syncing to the
  backend once online.

## Getting started

### Prerequisites
- Node.js 20+
- Docker (for local PostgreSQL) or an existing PostgreSQL 15+ instance

### 1. Start the database

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run seed
npm run start:dev
```

API listens on `http://localhost:3000/api`. Swagger docs at `http://localhost:3000/api/docs`.

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

App runs on `http://localhost:5173`.

### Demo login (after seeding)

| Role | Email | Password |
|---|---|---|
| Admin | admin@demo-hospital.ng | ChangeMe123! |
| Doctor | doctor@demo-hospital.ng | ChangeMe123! |
| Nurse | nurse@demo-hospital.ng | ChangeMe123! |
| Records Officer | records@demo-hospital.ng | ChangeMe123! |
| Pharmacist | pharmacist@demo-hospital.ng | ChangeMe123! |
| Lab Tech | labtech@demo-hospital.ng | ChangeMe123! |
| Billing Officer | billing@demo-hospital.ng | ChangeMe123! |

**Change these before any real deployment.**

## Core modules (MVP)

- Facility management (multi-tenant: one deployment can serve multiple hospital sites)
- Staff accounts with role-based access control (RBAC)
- Patient registration (MRN, NIN, NHIS number, demographics, next of kin)
- Encounters/visits, vital signs, diagnoses (ICD-10), prescriptions, lab orders & results
- Facility-wide lab worklist (`/labs`): every lab order/result across patients in one view
- NDPR consent capture and data-subject access/erasure requests
- Append-only audit logging of all access to patient data
- NCDC notifiable-disease flagging for reportable diagnoses
- Facility-wide pharmacy dispensing worklist (`/pharmacy`)
- Billing & NHIS/HMO claims (`/billing`): patient invoicing with a facility
  price list, payments, patient insurance coverage, and a claims workflow
  (bundle finalized invoices per payer/period → submit → adjudicate →
  mark paid, with CSV export) — there's no standardized electronic claims
  submission API across Nigerian payers, so this produces the bundle and
  export a billing officer submits manually per payer's own process
- Offline-first sync: the frontend queues writes locally and syncs when back online

## Tests

```bash
cd backend && npm test    # Jest — unit tests with Prisma mocked out
cd frontend && npm test   # Vitest
```

Backend specs cover the compliance-sensitive logic directly: role-based NIN
redaction, NDPR erasure/anonymisation, NCDC notifiable-disease auto-flagging,
and the sign-up/staff-creation RBAC rules (no open self-registration for
clinical roles). Frontend specs cover the offline-sync id scheme and the
demo-mode/real-session distinction the sync engine depends on. This is
deliberately not full coverage — it targets the logic most likely to
regress silently and least likely to be caught by manually clicking
through the UI.

## Deploying

GitHub Pages only serves static files, so it can host the frontend but not
the NestJS backend. The split used here: **backend on Render**, **database
on Supabase**, **frontend on GitHub Pages**.

### 1. Database (Supabase)

If you haven't already, create a project at [supabase.com](https://supabase.com)
and run the backend's migrations/seed against its **direct connection**
string (port 5432) as described above. Render will reuse this same database.

### 2. Backend (Render)

1. Push this repo to GitHub (already done if you're reading this on GitHub).
2. At [dashboard.render.com](https://dashboard.render.com), click **New +** →
   **Blueprint**, and point it at this repo. Render reads [`render.yaml`](./render.yaml)
   and proposes a `vitalis-api` web service.
3. Fill in the secrets it leaves blank (`sync: false` in `render.yaml`):
   - `DATABASE_URL` — the same Supabase direct-connection string you used locally.
   - `JWT_SECRET` — generate a fresh one for production:
     `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`
   - `FIELD_ENCRYPTION_KEY` — **must exactly match** the value you used
     locally when you ran `npm run seed` (it decrypts NIN/phone fields
     already encrypted with that key — a different key can't read them back).
   - `CORS_ORIGINS` — your GitHub Pages origin, e.g. `https://<owner>.github.io`.
4. Deploy. Render builds and runs `prisma migrate deploy` automatically on
   each deploy. Note the service URL, e.g. `https://vitalis-api.onrender.com`.

The free Render plan sleeps after inactivity — the first request after idle
takes ~30s to wake it back up.

### 3. Frontend (GitHub Pages)

1. In the repo: **Settings → Pages → Source → GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables** → add
   `VITE_API_BASE_URL` = `https://vitalis-api.onrender.com/api` (your Render
   URL from step 2, with `/api`).
3. Push to `main` (or run the **Deploy frontend to GitHub Pages** workflow
   manually from the Actions tab). [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml)
   builds the Vite app and publishes it.
4. The app will be live at `https://<owner>.github.io/Vitalis/`.

The frontend uses hash-based routing (`/#/patients`) on this deployment so
direct links and refreshes work without server-side rewrite rules, which
GitHub Pages doesn't support.

## Roadmap (not yet built)

- Full HL7 FHIR resource export for the Nigeria Health Data Exchange
- SMS/USSD patient reminders (common last-mile channel in Nigeria)
- Pharmacy stock/inventory tracking (dispensing itself is built — see Core modules)
- Multi-facility referral workflow

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

**Change these before any real deployment.**

## Core modules (MVP)

- Facility management (multi-tenant: one deployment can serve multiple hospital sites)
- Staff accounts with role-based access control (RBAC)
- Patient registration (MRN, NIN, NHIS number, demographics, next of kin)
- Encounters/visits, vital signs, diagnoses (ICD-10), prescriptions, lab orders & results
- NDPR consent capture and data-subject access/erasure requests
- Append-only audit logging of all access to patient data
- NCDC notifiable-disease flagging for reportable diagnoses
- Offline-first sync: the frontend queues writes locally and syncs when back online

## Roadmap (not yet built)

- Billing / NHIS & private HMO claims submission
- Full HL7 FHIR resource export for the Nigeria Health Data Exchange
- SMS/USSD patient reminders (common last-mile channel in Nigeria)
- Pharmacy inventory & dispensing workflow
- Multi-facility referral workflow

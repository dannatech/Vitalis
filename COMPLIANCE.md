# Regulatory compliance notes

This document explains how Vitalis maps to Nigerian healthcare and data-protection
regulation. It is engineering-level guidance, **not legal advice** — a real deployment
must still be reviewed by qualified Nigerian health-law/data-protection counsel and,
where required, registered with the Nigeria Data Protection Commission (NDPC).

## 1. Nigeria Data Protection Act 2023 / NDPR

| Requirement | Implementation |
|---|---|
| Lawful basis & consent | `ConsentRecord` model (`backend/prisma/schema.prisma`) captures purpose (treatment, research, NHIS/HMO data sharing, marketing), method (verbal/written/electronic), grant/revocation timestamps and the staff member who recorded it. Treatment itself relies on the "vital interest / provision of health care" lawful basis, but every *secondary* use (research, insurer sharing) requires an explicit granted `ConsentRecord`. |
| Data minimisation | API DTOs (`class-validator` + `whitelist: true` in `main.ts`) strip any field not explicitly declared — clients cannot smuggle extra PII into a record. |
| Right of access / rectification / erasure | `DataSubjectRequest` model + `consent` module endpoints (`GET/POST /consent/requests`). Erasure is implemented as **anonymisation**, not hard delete — see §3. |
| Security of processing | Field-level AES-256-GCM encryption for NIN and phone number (`common/crypto/encryption.service.ts`); passwords hashed with argon2; TLS termination expected at the reverse proxy in production (documented in `.env.example`); JWT-based auth with short-lived access tokens. |
| Accountability / audit trail | `AuditLog` is an append-only table (no update/delete endpoints exposed) written by a global interceptor (`common/interceptors/audit-log.interceptor.ts`) on every request that touches patient data: who, what, when, which patient, source IP. |
| Data Protection Officer / breach notice | Out of scope for the codebase — organisational process. `COMPLIANCE.md` flag left here as a reminder to appoint a DPO and register with NDPC per the Act. |
| Cross-border transfer | The system defaults to a single-region PostgreSQL instance. If deploying on cloud infra, keep the database in-country (or a jurisdiction with adequate protection per NDPC guidance) — documented in `.env.example` as a deployment note. |

## 2. NHIS / NHIA & HMO alignment

- `Patient.nhisNumber` captures the National Health Insurance Authority enrollee number.
- `Facility.nhisFacilityCode` captures the facility's NHIA-assigned code.
- Data model is intentionally close to FHIR `Patient`/`Encounter`/`Condition`/
  `MedicationRequest`/`ServiceRequest` shapes so that a future export to the Nigeria
  Health Data Exchange / FHIR profiles is a mapping exercise, not a rewrite.
- Billing/claims submission is **not yet implemented** (see README roadmap) — the data
  model has the identifiers claims workflows need, but no claims module exists yet.

## 3. Medical record retention vs. "right to erasure"

Nigerian health regulations (Medical and Dental Council of Nigeria practice rules,
and standard hospital record-keeping practice) require clinical records to be retained
for a minimum period (commonly cited as 6 years from last encounter, longer for
minors/obstetric records) regardless of a patient's NDPR erasure request. Vitalis
therefore implements erasure requests as **anonymisation**:

- Directly identifying fields (name, NIN, phone, address, next-of-kin) are overwritten
  with an anonymisation token.
- Clinical content (diagnoses, prescriptions, lab results) is preserved for legal
  retention and aggregate/statistical/public-health reporting, decoupled from identity.
- The action is logged in `AuditLog` and the originating `DataSubjectRequest` is marked
  resolved with a timestamp and the anonymisation rationale.

A hard-delete path is intentionally not exposed via the API.

## 4. NCDC / IDSR notifiable disease reporting

- `NotifiableDisease` is a reference table seeded with priority diseases under Nigeria's
  Integrated Disease Surveillance and Response (IDSR) framework (e.g. Cholera, Lassa
  fever, Measles, Yellow fever, cerebrospinal meningitis, Mpox, Acute Flaccid
  Paralysis/Polio, COVID-19).
- When a `Diagnosis` is recorded with an ICD-10 code matching a seeded notifiable
  disease, the API automatically flags it and creates a `NotifiableDiseaseReport` row.
- Actual transmission to NCDC's surveillance system (SORMAS or the national IDSR
  reporting line) is **not implemented** — this is a stub that gives a facility an
  internal worklist of what must be phoned/reported within the regulatory window
  (immediately for epidemic-prone diseases, weekly for others).

## 5. Clinical staff licensing

- `User.licenseNumber` and `User.licenseBody` (e.g. MDCN for doctors, NMCN for nurses,
  PCN for pharmacists) are captured for clinical roles, in preparation for optional
  license-validity checks — not yet enforced against a live registry.

## 6. What is deliberately out of scope for this first build

- Cloud/production hardening (WAF, secrets manager, HSM/KMS-backed key management —
  the current `EncryptionService` reads a key from an environment variable and documents
  that production deployments must move this to a proper KMS).
- Formal NDPC registration/audit filing — organisational, not code.
- Full HL7 FHIR server conformance.

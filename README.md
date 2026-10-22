# DoctorCare Pro — Doctor Prescription & Patient Management System

A production-ready healthcare SaaS platform built with Next.js App Router, TypeScript, Tailwind CSS, PostgreSQL, Prisma ORM, and cryptographic document integrity hashing. Designed with strict multi-tenancy, doctor-to-doctor data isolation, 15 integrated diagnostic labs, dedicated doctor and company admin portals, in-browser prescription previews, and role-based access control.

---

## 🔑 Dedicated Portal Links & Demo Credentials

Each role has a dedicated direct link to avoid any role confusion:

| Portal | Dedicated Direct Link | Login Email | Password | Quick Login Feature |
| :--- | :--- | :--- | :--- | :--- |
| **Doctor Portal** | `/doctor/login` | `dr.sharma@apollo.org` | `Healthcare@2026` | 1-Click "Quick Doctor Login" button |
| **Doctor (Pediatrician)** | `/doctor/login` | `dr.patel@apollo.org` | `Healthcare@2026` | Standard Doctor Login |
| **Company Admin Portal** | `/admin/login` | `admin@apollo.org` | `Healthcare@2026` | 1-Click "Quick Admin Login" button |
| **Delegated Clinical Staff** | `/doctor/login` | `staff.priya@apollo.org` | `Healthcare@2026` | Clinical Assistant to Dr. Sharma |
| **Super Admin Portal** | `/login` (Unified Hub) | `superadmin@doctorcare.saas` | `Healthcare@2026` | MFA code: `123456` |

---

## 🏥 15 Integrated Diagnostic Lab / Healthcare Providers

The Doctor portal features a dedicated top dropdown menu supporting 15 diagnostic partners:

1. **Dr Lal PathLabs**
2. **Tata 1mg**
3. **Redcliffe Labs**
4. **Healthians**
5. **Thyrocare**
6. **Metropolis Healthcare**
7. **Orange Health Labs**
8. **Agilus Diagnostics**
9. **Vijaya Diagnostic Centre**
10. **Neuberg Diagnostics**
11. **Aarthi Scans and Labs**
12. **Dr. Dangs Lab**
13. **JCRL Diagnostics**
14. **NHCare Pathlabs**
15. **QuikLabz**

### How Lab Selection Works:
- **Instant Patient Filtering:** Selecting any lab from the top bar dropdown immediately filters the patient and prescription list for that provider.
- **Add Patient Modal:** When adding a new patient, the chosen lab is automatically assigned or can be switched via dropdown.
- **Prescription Upload:** When uploading a prescription or clinical report, the lab partner is tagged and saved for full traceability.

---

## 👁️ Company Admin Live Prescriptions Feed & In-Browser Preview

Whenever a doctor uploads a prescription or document:
- **Real-Time Admin Visibility (`/admin`):** The Company Admin dashboard immediately reflects the new prescription with patient code, patient name, doctor name, diagnostic lab badge, and upload timestamp.
- **In-Browser Interactive Preview:** Click the **Preview** button on any record to view the document (both images and PDFs) directly in a secure modal without downloading.
- **Direct Download:** Click the **Download** button to securely download the verified file.
- **Full Prescriptions Registry (`/admin/prescriptions`):** Search, filter by doctor or lab, and audit all uploaded documents across the entire organization.

---

## 🛡️ Security & Privacy Architecture

- **Multi-Tenant Architecture**: Strict organization-level data isolation across hospital networks and private clinics.
- **Role-Based Access Control (RBAC)**: Distinct permissions for `SUPER_ADMIN`, `ADMIN`, `DOCTOR`, and `DELEGATED_STAFF`.
- **Doctor-to-Doctor Patient Isolation**: Zero data leakage between physicians unless explicitly granted.
- **Team Access & 3-Delegate Limit**: Doctors can invite up to 3 active/pending clinical assistants with granular privilege toggles and instant revocation.
- **Cryptographic Prescription Vault**: Non-public private storage with SHA-256 file integrity hashing. Finalized prescriptions cannot be silently edited. Corrections create immutable version addendums with clinical justification.
- **Advanced Real-Time Search**: Search-as-you-type with debouncing across patient name, phone number, email, Patient ID, and diagnostic lab.
- **Secure Export Engine**: CSV exports sanitized against CSV formula injection attacks (`=`, `+`, `-`, `@`) and logged in the audit trail.
- **Audit Logging**: Immutable logging of logins, uploads, downloads, exports, and permission modifications.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Database**: PostgreSQL 16
- **ORM**: Prisma 6
- **Styling**: Tailwind CSS 4 with custom healthcare palette
- **Icons**: Lucide React
- **Authentication**: JWT (HS256) with `jose`, `bcryptjs` password hashing, and HttpOnly secure cookies
- **Validation**: Zod schema validation
- **Testing**: Vitest for unit & security tests (9/9 passing)

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL container
docker run --name doctor-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=doctor_db -p 5432:5432 -d postgres:16-alpine

# 3. Synchronize Prisma database schema
npx prisma db push

# 4. Seed database with initial clinics, doctors, diagnostic labs, and demo patients
node scripts/seed.mjs

# 5. Run automated tests
npm run test

# 6. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) or navigate directly to `/doctor/login` or `/admin/login`.

---

## ☁️ Deployment on Vercel

```bash
# Deploy to Vercel
npx vercel --prod
```

### Required Production Environment Variables:
- `DATABASE_URL`: Cloud PostgreSQL connection string (e.g. Neon, Supabase, or Vercel Postgres)
- `JWT_SECRET`: Random 64-character secret
- `AUTH_SECRET`: Random 64-character secret
- `NEXT_PUBLIC_APP_URL`: Your deployed production URL (e.g. `https://your-domain.vercel.app`)

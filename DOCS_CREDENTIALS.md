# 📋 DoctorCare Pro — System Credentials & Direct Links Quick Reference

This document contains all direct login URLs, passwords, roles, and instructions for client demonstrations and administrative access.

---

## 🌐 1. Direct Portal Access Links

### 🩺 Doctor Portal (Exclusive Doctor Sign-In)
- **URL**: [http://localhost:3000/doctor/login](http://localhost:3000/doctor/login)
- **Purpose**: Direct login for doctors and clinical assistants without any admin clutter.
- **Demo Quick Access**: Click the prominent **"Quick Doctor Login (Dr. Sharma)"** button to enter immediately.

### 🏢 Company Admin Portal (Exclusive Admin Sign-In)
- **URL**: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
- **Purpose**: Direct login for hospital/clinic administrators to view doctors, prescriptions, analytics, and audit logs.
- **Demo Quick Access**: Click the prominent **"Quick Admin Login"** button to enter immediately.

### 🌐 Unified Login Hub (Selector)
- **URL**: [http://localhost:3000/login](http://localhost:3000/login)
- **Purpose**: Multi-portal landing page with visual cards for Doctor, Company Admin, and Staff.

---

## 🔐 2. All User Accounts & Passwords

**Default Password for all demo accounts**: `Healthcare@2026`

| Role | Name | Email | Password | Access Level |
| :--- | :--- | :--- | :--- | :--- |
| **Senior Doctor** | Dr. Rajesh Sharma | `dr.sharma@apollo.org` | `Healthcare@2026` | Full Doctor portal, patient records, prescription uploads, team management |
| **Consultant Doctor** | Dr. Ananya Patel | `dr.patel@apollo.org` | `Healthcare@2026` | Isolated doctor portal with private patient roster |
| **Doctor (Clinic 2)** | Dr. Vikram Gupta | `dr.gupta@maxcare.org` | `Healthcare@2026` | Multi-tenant isolated doctor account (Max Care) |
| **Company Admin** | Apollo Clinic Admin | `admin@apollo.org` | `Healthcare@2026` | Clinic-wide oversight, doctor management, real-time prescription preview/download, reports |
| **Delegated Staff** | Priya Nair | `staff.priya@apollo.org` | `Healthcare@2026` | Delegated clinical assistant to Dr. Sharma |
| **Super Admin** | System Governance | `superadmin@doctorcare.saas` | `Healthcare@2026` | Platform-wide administration (MFA Code: `123456`) |

---

## 🧪 3. Integrated 15 Diagnostic Labs

The top bar of the Doctor Portal features a dropdown with all 15 diagnostic providers:

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

Selecting any lab immediately filters patients and prescriptions for that specific diagnostic partner.

---

## 📄 4. Prescription Document Preview & Download in Admin

- **Admin Dashboard (`/admin`)**:
  - Live Doctor Prescriptions Table shows all patient uploads.
  - **"Preview" Button**: Launches an interactive in-browser modal displaying images or PDFs.
  - **"Download" Button**: Directly downloads the SHA-256 verified prescription file.
- **Full Prescription Directory (`/admin/prescriptions`)**:
  - Search by patient code, name, doctor, or diagnostic lab.
  - View upload dates, file sizes, and download/preview on demand.

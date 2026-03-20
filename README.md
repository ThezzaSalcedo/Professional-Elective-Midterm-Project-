# 🎓 NEU MOA Management System
**Secure Memorandum of Agreement (MOA) Tracking & Administration Portal**

## 📌 Project Overview
The **NEU MOA Management System** is a specialized platform designed for New Era University to streamline the lifecycle of Memorandums of Agreement (MOA). It ensures legal compliance, institutional security, and transparent tracking of partnerships between the university and HTE (Host Training Establishment) partners.

---

## 🛡️ Role-Based Access Control (RBAC)

The system enforces strict access levels to maintain data integrity and privacy:

| Role | Dashboard Access | Permissions |
| :--- | :--- | :--- |
| **Admin** | **Full Admin Suite** | User management, audit trail visibility, soft-delete recovery, and full CRUD. |
| **Faculty** | **Maintainer View** | View all active MOAs. Add/Edit/Soft-Delete only if granted by Admin. |
| **Student** | **Public View** | View-only access to **Approved** MOAs. No access to internal processing or audit logs. |

---

## 🚀 Key Features

* **🔒 Institutional Lockdown:** Strictly restricted to `@neu.edu.ph` Google accounts.
* **📊 Status Workflow:** Categorizes MOAs into 8 specific states:
    * *Approved:* Signed, Notarizing, or No Notarization Needed.
    * *Processing:* HTE Signature, Legal Review, or VPAA/OP Approval.
    * *Lifecycle:* Expired or Expiring (within 60 days).
* **📝 Audit Trail:** Automated internal logging of every user action (Insert, Edit, Delete) with timestamps.
* **♻️ Soft Delete:** Entries are never permanently lost; Admins can "Recover" deleted rows.
* **🔎 Advanced Search:** Global search bar filtering by College, Industry, Company, or Contact Person.
* **📈 Statistics Dashboard:** Real-time cards showing the count of Active, Processing, and Expired MOAs.

---

## 🛠️ Tech Stack

* **Framework:** [Next.js 15](https://nextjs.org/) (App Router & Turbopack)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **Backend/Database:** [Firebase](https://firebase.google.com/) (Firestore & Authentication)
* **Icons:** [Lucide React](https://lucide.dev/)
* **Auth:** Google OAuth 2.0 (Restricted to NEU Domain)

---
Live Link: 
[NEU MOA Monitoring App](https://professional-elective-midterm-proje.vercel.app/)

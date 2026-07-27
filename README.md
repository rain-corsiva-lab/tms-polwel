# POLWEL PDMS — Participant Data Management System

Welcome to the **POLWEL Participant Data Management System (PDMS)** repository. This repository contains the complete frontend web application and backend API services for managing training courses, course runs, associate trainers, client organizations, learners, attendance, billing exports, and automated certificate generation for **POLWEL**.

---

## 📋 Table of Contents

- [Overview & Key Features](#-overview--key-features)
- [Technology Stack](#-technology-stack)
- [System Architecture](#-system-architecture)
- [Directory Structure](#-directory-structure)
- [Key Modules & Domain Logic](#-key-modules--domain-logic)
  - [1. Multi-Organization Training Coordinator Scoping](#1-multi-organization-training-coordinator-scoping)
  - [2. Attendance & Waiver Requests System](#2-attendance--waiver-requests-system)
  - [3. Course Run & Organization Merge Tools](#3-course-run--organization-merge-tools)
  - [4. Automated PDF Certificate Generation](#4-automated-pdf-certificate-generation)
  - [5. Reporting & Consolidated Billing Exports](#5-reporting--consolidated-billing-exports)
  - [6. Email Logging & Retry Queue System](#6-email-logging--retry-queue-system)
- [Getting Started & Local Development](#-getting-started--local-development)
  - [Prerequisites](#prerequisites)
  - [Environment Configuration](#environment-configuration)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Deployment & Operations](#-deployment--operations)
  - [Deployment Scripts](#deployment-scripts)
  - [Puppeteer Linux Shared Dependencies](#puppeteer-linux-shared-dependencies)
  - [IP Unblocking Utility](#ip-unblocking-utility)
- [Documentation & Change Logs](#-documentation--change-logs)

---

## 🎯 Overview & Key Features

POLWEL PDMS is an enterprise-grade platform designed to streamline training operations and participant administration. Main features include:

- **Role-Based Access Control (RBAC)**: Fine-grained permissions using CASL for `POLWEL` Administrators, `TRAINING_COORDINATOR` users, and `TRAINER` accounts.
- **Multi-Tenant / Multi-Organization Scoping**: Many-to-many relationship supporting Training Coordinators managing multiple client organizations from a unified dashboard selector.
- **Attendance & Waiver Management**: Attendance marking with automated waiver submission and approval workflows for excused absences.
- **Billing & Exports**: ExcelJS-powered billing exports featuring multi-level cell merging and hierarchical grouping.
- **Headless PDF Printing**: Puppeteer integration for generating high-resolution, custom-styled training certificate PDFs.
- **Resilient Email Engine**: Dual support for Microsoft Graph API and Direct SMTP, complete with delivery tracking, CC management, and automatic retry queues.
- **Data Cleanup Tools**: Admin management interfaces for detecting and merging duplicate course runs or client organizations without data loss.

---

## 🛠 Technology Stack

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **UI Components**: Shadcn UI + Tailwind CSS + Lucide Icons
- **Routing**: React Router v6
- **State & Data Fetching**: TanStack React Query
- **Authorization**: CASL (`@casl/react`, `@casl/ability`)
- **Excel & Document Utilities**: ExcelJS, XLSX

### Backend
- **Runtime**: Node.js + Express + TypeScript
- **Database & ORM**: MySQL + Prisma ORM
- **Authentication**: Custom Session Token Authentication + MFA (Multi-Factor Authentication) + Bcrypt
- **PDF Engine**: Puppeteer (Headless Chromium)
- **Mailer Engine**: Microsoft Graph API (`@azure/msal-node`) / Nodemailer SMTP

---

## 🏗 System Architecture

```mermaid
graph TD
    Client[Browser / Client SPA] -->|HTTP / REST API| Express[Express.js Node.js Backend]
    Express -->|ORM Queries| Prisma[Prisma ORM]
    Prisma -->|SQL| MySQL[(MySQL Database)]
    Express -->|PDF Render| Puppeteer[Headless Chromium Engine]
    Express -->|Email Dispatch| Mailer[Microsoft Graph API / Nodemailer]
```

---

## 📁 Directory Structure

```
polwel/
├── src/                                  # React Frontend Application
│   ├── components/                       # Reusable UI components & dialog modals
│   │   ├── ui/                           # Base Shadcn UI components
│   │   ├── LinkExistingCoordinatorDialog.tsx
│   │   ├── MergeDuplicateCourseRunsDialog.tsx
│   │   ├── ViewLearnersDialog.tsx
│   │   └── Sidebar.tsx                   # Main navigation sidebar
│   ├── hooks/                            # Custom React hooks (useAuth, usePermission)
│   ├── lib/                              # Utility libraries (api, auth, date, CASL, billing exports)
│   ├── pages/                            # Application page views
│   │   ├── OrganizationDashboard.tsx     # Training Coordinator multi-org dashboard
│   │   ├── EmailLogs.tsx                 # Email audit logs & retry queue UI
│   │   ├── PostRunDetail.tsx             # Post-course run attendance & billing UI
│   │   └── reporting/                    # Reporting dashboard sub-views
│   ├── App.tsx                           # Main route definitions & providers
│   └── main.tsx                          # Application entrypoint
├── polwel-backend/                       # Express Node.js Backend Application
│   ├── prisma/                           # Prisma schema & database migrations
│   │   └── schema.prisma                 # Primary database schema definition
│   ├── src/
│   │   ├── controllers/                  # Express route controllers
│   │   ├── middleware/                   # Authentication, rate limiting, and CASL middleware
│   │   ├── routes/                       # Express API endpoints definition
│   │   ├── services/                     # Business logic (emailService, certificateService)
│   │   └── index.ts                      # Express server entrypoint
│   └── package.json
├── documentations/                       # Chronological technical documentation markdown logs
├── execute-prod.sh                       # Production deployment script
├── execute-stag.sh                       # Staging deployment script
├── install-puppeteer-deps.sh             # Automatic Linux shared libraries installer
├── unblock-ips.sh                        # Memory-store IP unblock script
├── htaccess                              # Production Apache URL rewrite configuration
└── README.md                             # System documentation (this file)
```

---

## 🔑 Key Modules & Domain Logic

### 1. Multi-Organization Training Coordinator Scoping
Training Coordinators can be linked to one or more Client Organizations via the `user_organizations` junction table (`UserOrganization` model).
- **Authentication**: Session deserialization populates `req.user.organizationIds`.
- **UI Tab Selector**: When a Training Coordinator manages multiple organizations, `OrganizationDashboard.tsx` renders a tab selector to dynamically switch views and scope metrics.

### 2. Attendance & Waiver Requests System
- **Attendance Statuses**: Learners are marked as `PRESENT`, `ABSENT`, or `PENDING`.
- **Approved Waivers**: When a learner's absence waiver is approved in `waiverController.ts`, their `attendanceStatus` remains `'ABSENT'` with `waiverStatus = 'APPROVED'`. This automatically excludes them from billing entries while disabling certificate download triggers.

### 3. Course Run & Organization Merge Tools
Admin clean-up tools accessible from **Home.tsx**:
- **Merge Duplicate Course Runs**: Merges duplicate runs sharing the same course project and start date. Shifts bookings, email logs, cancellation attachments, and attendance records to the primary run without constraint errors.
- **Merge Duplicate Organizations**: Merges duplicate client organizations, re-linking coordinators and learners to the consolidated target organization.

### 4. Automated PDF Certificate Generation
Certificate generation is powered by Puppeteer in `certificateService.ts`.
- **Headless Execution**: Configured with `--no-sandbox` and `--disable-setuid-sandbox` flags for seamless operation inside headless Linux environments.
- **Shared Libraries**: The `install-puppeteer-deps.sh` helper automatically installs system dependencies (`libatk-1.0.so.0`, `libgbm`, etc.) during deployment.

### 5. Reporting & Consolidated Billing Exports
- **Excel Exports**: `consolidatedBillingExport.ts` uses ExcelJS to generate billing spreadsheets with multi-level merged headers and dynamic course grouping.
- **Filtering**: Automatically excludes cancelled course runs and approved waiver learners.

### 6. Email Logging & Retry Queue System
- **Audit Logging**: Every outgoing email attempt is recorded in the `email_logs` table (`EmailLog` model) with status, attempts, error messages, and stack trace details.
- **Retry Queue**: Failed emails enter an automated retry queue (`email_retry_queue`) with exponential backoff and maximum retry thresholds.
- **UI Console**: POLWEL Administrators can inspect delivery statistics, search email logs, and manage retry jobs from `/email-logs`.

---

## 🚀 Getting Started & Local Development

### Prerequisites
- **Node.js**: v18.x or v20.x
- **MySQL**: v8.0 or MariaDB v10.5+
- **Git**

### Environment Configuration

1. **Root `.env` (Frontend)**:
   ```env
   VITE_API_URL=http://localhost:3001/api
   ```

2. **Backend `.env` (`polwel-backend/.env`)**:
   ```env
   PORT=3001
   NODE_ENV=development
   DATABASE_URL="mysql://root:password@localhost:3306/polwelpdms"
   SESSION_SECRET="your-secure-session-secret"
   ENABLE_RATE_LIMIT=false
   DISABLE_RATE_LIMIT=true
   ```

### Backend Setup

```bash
# Navigate to backend directory
cd polwel-backend

# Install dependencies
npm install

# Push database schema to local MySQL instance
npx prisma db push

# Start backend in development mode
npm run dev
```

### Frontend Setup

```bash
# Navigate to root directory
cd ..

# Install dependencies
npm install

# Start Vite frontend development server
npm run dev
```

Open `http://localhost:5173` in your browser to access the application.

---

## 📦 Deployment & Operations

### Deployment Scripts
- **Staging**: Execute `./execute-stag.sh` to pull the `staging` branch, build frontend/backend assets, run `install-puppeteer-deps.sh`, and restart PM2 backend services.
- **Production**: Execute `./execute-prod.sh` to deploy the `main` branch.

### Puppeteer Linux Shared Dependencies
If certificate PDF generation fails with shared library errors on bare Linux servers:
```bash
chmod +x ./install-puppeteer-deps.sh
./install-puppeteer-deps.sh
```

### IP Unblocking Utility
If an IP address gets rate-limited or blocked:
```bash
chmod +x ./unblock-ips.sh
./unblock-ips.sh
```

---

## 📄 Documentation & Change Logs

Detailed, date-stamped technical documentations for every change are stored in the `/documentations` folder:

- `documentations/2026_07_27_09_04_changes_pointing-local-git-to-otg-lab-repository.md`
- `documentations/2026_07_27_08_23_changes_fixing-email-logs-page-access-and-routing.md`
- `documentations/2026_07_27_08_14_changes_pointing-local-git-to-github-exclusively.md`
- `documentations/2026_07_22_18_27_changes_ignoring-specstory-folder-to-prevent-secret-exposure.md`
- `documentations/2026_07_17_06_33_changes_conditional-learners-tables-in-dashboard-popup.md`
- And earlier change logs in `/documentations`.

---

*Maintained by POLWEL & OTG-Lab Development Teams.*

# Technical Documentation: Creating Comprehensive System README File

* **Date & Time:** 27 July 2026, 09:06 (Local Time)
* **Title:** Creating Comprehensive System README File
* **Author:** Antigravity AI Code Assistant

---

## 1. Goal Description
The goal of this task is to create a complete, production-grade `README.md` at the project root explaining every single technical aspect of the **POLWEL Participant Data Management System (PDMS)** codebase.

---

## 2. Documented Content

### Key Sections Added
1. **Overview & Features**: Highlighting RBAC (CASL), multi-tenant scoping, attendance/waivers, billing exports, PDF generation, email retry engine, and duplicate cleanup tools.
2. **Technology Stack & Architecture**: Detailed breakdown of React 18, Vite, Shadcn UI, Express, Node.js, Prisma, MySQL, Puppeteer, and Mailer integrations with Mermaid architectural diagram.
3. **Directory Structure Map**: Full visual tree mapping of the project structure (`/src`, `/polwel-backend`, `/documentations`, deployment scripts).
4. **Domain Modules & Technical Logic**: Deep dives into multi-organization scoping, attendance/waivers, duplicate course run/org merger logic, headless Puppeteer configuration, ExcelJS billing exports, and email logs retry queues.
5. **Local Setup & Environment Config**: Step-by-step instructions for environment variables, database schema initialization (`prisma db push`), backend execution, and Vite frontend server startup.
6. **Deployment & Operational Scripts**: Usage instructions for `execute-stag.sh`, `execute-prod.sh`, `install-puppeteer-deps.sh`, and `unblock-ips.sh`.

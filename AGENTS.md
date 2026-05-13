# findance: Next-Generation Finance Platform

## Project Overview
You are working on the "findance" application. This is a complete rewrite of a previous Ruby on Rails project into a modern, high-performance stack:
*   **Backend**: Python (FastAPI, SQLAlchemy, SQLite/PostgreSQL) located in the `backend/` directory.
*   **Frontend**: Next.js (React, Tailwind CSS, Framer Motion) located in the `frontend/` directory.

## Your Persona & Objective
**Role**: You are an elite, highly opinionated Lead UI/UX Product Designer and Full-Stack Engineer at a boutique digital agency known for disrupting traditional fintech interfaces. 
**Objective**: Build a unique finance app that strictly avoids the "generic SaaS tech" aesthetic. The design system must feel organic, editorial, and flawlessly intuitive.

## Core Design Principles (The Elite Editorial Aesthetic)
Failure to adhere to these rules is unacceptable. Every piece of UI must follow this logic:
1.  **Zero Cliché**: Absolutely NO default "trust blue" gradients, NO generic floating glass cards, NO drop shadows, and NO containers.
2.  **Typography as UI**: Use scale, weight, and layout of text to create hierarchy instead of relying on borders and boxes. Think high-end printed wealth prospectuses.
3.  **Color Palette**:
    *   Background: `Alabaster / Parchment` (`#FAF9F6`)
    *   Primary Ink: `Rich Black` (`#1C1C19`)
    *   Secondary Text: `Grounded Warm Gray` (`#828076`)
    *   Accents: `Deep Forest Green` (`#3E6150`) for positive flow/surplus, `Muted Terracotta` (`#D35236`) for major outflows/debt.
4.  **Fonts**: `Playfair Display` or `Instrument Serif` for major numbers and headers. `Inter` or `Geist` for hyper-legible metadata and utility text.
5.  **Progressive Disclosure (Deep Insights)**: Keep the main dashboard (`/`) perfectly clean and calm (Net worth, sparkline, ledger). All heavy data (Sankey diagrams, Donut charts) must be placed in the `/insights` page. Charts must be built bespoke or heavily stripped of generic axes/tooltips to match the aesthetic.

## Current Progress (What has been achieved)
*   **Phase 1 (Backend Foundation)**: Initialized FastAPI, Alembic migrations, and SQLAlchemy models for Users, Accounts, Transactions, and Categories.
*   **Phase 2 (Frontend Foundation)**: Initialized Next.js. Stripped out all default Tailwind code. Set up the Alabaster/Ink palette in `globals.css` and the typography in `layout.tsx`.
*   **Phase 2.1 & 2.2 (The Core Screens)**: Built the complete suite of Elite Editorial screens:
    *   `app/page.tsx` (The Overview Dashboard with "Press-and-Hold" friction ledger).
    *   `components/Masthead.tsx` (Global navigation replacing sidebars with a full-screen "The Index" overlay).
    *   `app/transactions/page.tsx` (The Archive).
    *   `app/accounts/page.tsx` (The Holdings).
    *   `app/strategy/page.tsx` (The Strategy).
    *   `app/settings/page.tsx` (Preferences).
*   **Phase 2.3 (Deep Insights Visualization)**: Replicated complex financial dashboards via progressive disclosure in `app/insights/page.tsx`. Specifically engineered a bespoke, mathematically proportional SVG Sankey diagram (`BespokeSankey.tsx`) without relying on generic charting libraries.
*   **Phase 3 (Backend Integration)**: Connected frontend to FastAPI backend with full CRUD for Accounts, Transactions, Categories, and Analytics endpoints. Seed data populates default user, categories, and sample accounts.
*   **Phase 3.1 (Income Tracker)**: Built a branching conditional income form with progressive disclosure — distinct from the expense form. Supports user-managed dropdown options, 8-currency selector, and receipt type tracking.

## Next Steps (Where you should pick up)
*   **Phase 4 (Integrations)**: Automated bank sync (Plaid, SimpleFIN, etc.), rules engine, and AI MCP server setup.

## Technical Commands
*   **Frontend**: `cd frontend && npm run dev`
*   **Backend**: `cd backend && uvicorn app.main:app --reload`
*   **Database**: Alembic migrations live in `backend/alembic/`.
*   **Seed Data**: `cd backend && python -m app.db.seed`

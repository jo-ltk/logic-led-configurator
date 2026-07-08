# LOGIC LED Videowall Configurator & Quotation Management System

## Original Problem
Enterprise-grade web app for LOGIC to configure LED videowalls, generate professional quotations/technical documents, and manage the entire quotation database. Premium UI (Apple/Notion/Linear/Vercel feel), light + dark mode, role-based access.

## Stack (as built)
- Backend: FastAPI + Motor (MongoDB), JWT auth (httpOnly cookies + Bearer), bcrypt
- PDF: ReportLab · Excel: openpyxl
- AI: emergentintegrations → Claude Sonnet 4.5 (`claude-sonnet-4-6`) with Emergent LLM key
- Frontend: React 19 + Tailwind + shadcn/ui + Recharts + Framer Motion + Sonner
- Fonts: Space Grotesk (display) + Manrope (body)

## User Personas
- **Super Admin** — full access
- **Product Manager** — edit products / specifications
- **Sales Manager** — generate + view all quotations
- **Sales Executive** — generate + view only own quotations
- **Presales Engineer** — configure walls + technical sheets

## Test Credentials
See `/app/memory/test_credentials.md`.

## What's Implemented (Feb 2026 – first ship)
- ✅ JWT auth (login/logout/me) with 5 roles + brute-force safe
- ✅ Dashboard with 6 KPIs and 5 Recharts (monthly trend, status pie, indoor/outdoor, pitch dist, salesperson perf) + recent quotes table
- ✅ Product Master: 8 seeded LOGIC products, full CRUD + duplicate + archive (role-guarded)
- ✅ LED Videowall Configurator: category→product select, dimension entry (mm/cm/m/ft/in with live conversion), live SVG cabinet-grid preview, auto-calc (cabinets, resolution, pixels, aspect ratio, LED area, weight, power kW, MCB, UPS, cable gauge, viewing distance)
- ✅ Auto BOQ (9 line items: cabinet, receiving/sending card, processor, frame, install, cables, packing, spares) + GST + grand total
- ✅ Quote Generator: creates quote LOGIC/Q/YYYY/#### with revision + status (draft/submitted/won/lost/cancelled) + version snapshot
- ✅ Professional PDF export (cover + exec summary + technical config + BOM + T&C + signature)
- ✅ Excel export (Cover / BOQ / Configuration / Specifications sheets)
- ✅ Customer + Partner directories (CRUD with dialog form)
- ✅ Reports page (monthly / quarterly / yearly bar chart, quoted vs won)
- ✅ Settings page (company details, GST, bank, quote prefix, defaults)
- ✅ AI Assistant: product recommendation for use-case via Claude Sonnet 4.5
- ✅ AI Executive Summary generator on each quote detail
- ✅ Dark / Light theme toggle in sidebar
- ✅ RBAC enforced: sales_executive sees own quotes only; product edits gated

## Deferred / Next Iterations
- P1: 3D interactive room visualization
- P1: Email quotation + SMTP integration
- P1: OCR tender/spec extraction (PDF ingestion)
- P2: Activity logs / audit trail / version diff view
- P2: Multi-currency, multi-language
- P2: CRM/ERP integration webhooks
- P2: Digital signature + QR verification on PDF

## Known Notes
- All data seeds automatically on backend startup
- AI endpoints (POST /api/ai/recommend, /api/ai/proposal-summary) require positive Emergent LLM key balance; graceful 402 error surfaced if budget exceeded

## Iteration 4 (Feb 2026) — Enterprise expansion (17-module PRD)
- ✅ **7-role migration**: super_admin / admin / dealer / sales / presales / consultant / customer (legacy roles auto-migrated on startup)
- ✅ **Novastar Controller Engine** — 9 controllers (VX600, VX1000, VX16S, MX20, MX40 Pro, H2, H5, CX40, MCTRL660) + auto-planner
- ✅ **Power Engineering** — 230V/110V, single/three-phase, MCB/RCCB (IEC), cable sizing, voltage drop, sockets, earthing, UPS, generator, monthly cost
- ✅ **Network Engineering** — home runs, CAT6/CAT6A/Fiber selection, patch cords, RJ45, switch, signal flow
- ✅ **Structural Engineering** — wall load, anchor bolts, mount recommendation (wall/hanging/floor), maintenance clearance
- ✅ **Multi-user control panel** — Users & Access page with CRUD + role assignment + active toggle
- ✅ **Projects Pipeline** — 10-column kanban (Enquiry → Warranty)
- ✅ **AI Renders** — Nano Banana (gemini-3.1-flash-image-preview) with 11 scene templates (meeting room, auditorium, retail, mall, airport, control room, school, hospital, DOOH, corporate, broadcast studio)
- ✅ **AI Content Generator** — Claude Sonnet 4.5 for tender specs / datasheet / LinkedIn / proposal / brochure / email / comparison sheet
- ✅ **Emergent Object Storage** — /api/upload + /api/files/{id} + render persistence

## Deferred (not yet built)
- SVG drawings (front/rear/side/top views)
- PowerPoint proposal export
- 10-step wizard mode (guided config)
- Dealer portal deep features (saved projects, lead management)
- Interactive Flat Panel / Professional Display / Digital Signage / Video Conf / Broadcast Studio / AV Rack configurators (architecture supports these)

## Iteration 5 (Feb 2026) — Configurator + Engineering deep polish
- ✅ **Configurator**: pixel-pitch filter, standard-resolution presets (HD → 8K), manual matrix mode with live dim conversion, per-quote controller override, BOM undo/redo, environment (indoor/outdoor) selector, auto-persists state to localStorage
- ✅ **Controllers**: full CRUD via UI (add/edit/delete custom controllers alongside 9 seeded Novastar entries)
- ✅ **Engineering Power**: auto-loads from configurator, Indian standard MCB combos only (6/10/16/20/32 A), per-parameter export-to-PDF toggles
- ✅ **Engineering Network**: shows matrix + resolution + total pixels inline. Indoor → vertical column looping (1 loop per column, splits into 2 halves on overflow). Outdoor → horizontal row looping (same split rule). Live-editable inputs with cascading recalc.
- ✅ **Engineering Structural**: redesigned with visual mount-type cards (Wall Mount / Suspended / Floor Stand), auto-loads config
- ✅ **PDF export**: cover intro (editable at quote-level), spec sheet with product image, power section, network section, controller info, render image inline, section-selectable via `pdf_sections`. Safe against partial/None values.
- ✅ **Bug fix (iter 5 review)**: PDF endpoint no longer 500s when partial engineering data attached — uses safe formatter for all None values.

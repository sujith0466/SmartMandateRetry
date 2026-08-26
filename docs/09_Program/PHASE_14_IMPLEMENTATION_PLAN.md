# SmartMandateRetry — Phase 14 Implementation Plan: Premium Merchant Console Experience

> **Document ID:** DOC-PROG-039  
> **Phase:** Phase 14 — Premium Merchant Console Experience  
> **Status:** APPROVED IMPLEMENTATION CONTRACT  
> **Author:** Principal Frontend Architect & UI Motion Engineer  
> **Dependencies:** Phase 2–13 (Complete & Frozen), AI Provider Hardening (Complete & Frozen)  

---

## 1. Executive Summary & Aesthetic Vision

Phase 14 upgrades the SmartMandateRetry Merchant Console into a fintech-grade, executive SaaS interface designed to compete visually and experientially with industry-leading products like Linear, Stripe, Vercel, and Ramp.

### Visual & Experiential Principles
1. **Fintech Authority & Elegance:** Dark navy / slate foundations (`#0B0F19`, `#111827`), emerald recovery accents (`#10B981`), electric violet policy highlights (`#8B5CF6`), and razor-sharp borders (`#1F2937`, `#374151`).
2. **Intentional Micro-Motion:** Micro-interactions (150–300ms cubic-bezier) powered by **Framer Motion** with staggered page entrances, interactive state pills, smooth accordion expansions, and `prefers-reduced-motion` compliance.
3. **Data Clarity & Visual Scannability:** Compact yet breathable tabular grids, monospace transaction references, distinct status glows, and visual recovery lifecycle progression tracks.
4. **Resilient States:** Elegant skeleton loaders, informative empty states with call-to-action helpers, non-blocking toast notifications, and in-place error retry controls.
5. **Zero Backend Regression:** Pure presentation layer upgrade. All data flows strictly through the frozen Phase 12 Merchant APIs without modifying database models, policy rules, or recovery dispatchers.

---

## 2. Design System & Token Architecture

### 2.1 Color Palette & Theme Tokens
- **Surface / Backgrounds:**
  - `bg-fintech-canvas`: `#0B0F17` (Deep obsidian canvas)
  - `bg-fintech-card`: `#111827` (Charcoal surface with 1px border)
  - `bg-fintech-subtle`: `#1E293B` (Elevated panel / hover state)
- **Accents & Indicators:**
  - **Success / Settled:** Emerald (`#10B981` / `rgba(16, 185, 129, 0.12)`)
  - **Active / Scheduled:** Electric Indigo (`#6366F1` / `rgba(99, 102, 241, 0.12)`)
  - **Policy Review / Hold:** Violet (`#8B5CF6` / `rgba(139, 92, 246, 0.12)`)
  - **In-Flight Intervention:** Amber (`#F59E0B` / `rgba(245, 158, 11, 0.12)`)
  - **Terminal Failed / Stopped:** Crimson (`#EF4444` / `rgba(239, 68, 68, 0.12)`)

### 2.2 Reusable UI Component Toolkit
- `Badge`: Status and state pills with optional glowing dot indicator.
- `StatCard`: Glass-bordered metric card with icon container, formatted currency, and trend subtitle.
- `Timeline`: Interactive visual recovery lifecycle state progression with active glowing tracks.
- `SkeletonLoader`: Shimmering placeholder components for table rows and stat cards during data fetch.
- `PayloadModal`: Dark syntax-highlighted JSON viewer with copy-to-clipboard feedback.
- `ToastContainer`: Non-blocking floating alerts for user copy and action feedback.

---

## 3. Granular Task Breakdown (`TSK-023-01` .. `TSK-023-14`)

| Task ID | Component | Task Description | Priority |
|---|---|---|---|
| `TSK-023-01` | **Design System & Tailwind Tokens** | Configure Tailwind theme with dark fintech palette, glassmorphism utilities, and typography tokens | P0 |
| `TSK-023-02` | **Framer Motion Setup** | Integrate `framer-motion` page transition wrappers and motion variants (`fadeIn`, `staggerContainer`, `slideUp`) | P0 |
| `TSK-023-03` | **Reusable UI Toolkit** | Build shared components (`Badge`, `StatCard`, `SkeletonLoader`, `Timeline`, `PayloadModal`, `Toast`) | P0 |
| `TSK-023-04` | **Premium Navigation Shell** | Upgrade `Layout.tsx` with sleek collapsible sidebar, active route indicators, engine status pulse, and merchant badge | P0 |
| `TSK-023-05` | **Premium Dashboard** | Redesign `DashboardPage.tsx` with hero KPI cards, animated counters, visual state distribution bars, and health matrix | P0 |
| `TSK-023-06` | **Premium Cases Inbox** | Redesign `CasesPage.tsx` with search filter, multi-state dropdowns, responsive data grid, and page jump controls | P0 |
| `TSK-023-07` | **Executive Case Detail** | Redesign `CaseDetailPage.tsx` with split-pane layout, interactive lifecycle track, and quick copy-to-clipboard IDs | P0 |
| `TSK-023-08` | **Actions & Provider Timeline** | Build animated action execution timeline in `CaseDetailPage` with external gateway references | P0 |
| `TSK-023-09` | **Settlement Reconciliation Card**| Upgrade Settlement Reconciliation section with verification badges, timestamp formatting, and amount breakdown | P0 |
| `TSK-023-10` | **Premium Audit Trail** | Redesign `AuditPage.tsx` with structured JSON inspector modal, copyable correlation IDs, and actor badges | P0 |
| `TSK-023-11` | **Visual Safety Policies** | Redesign `PoliciesPage.tsx` with interactive constraint cards, threshold meters, and auto-stop rule badges | P0 |
| `TSK-023-12` | **Premium Analytics & Health** | Redesign `AnalyticsPage.tsx` and `ObservabilityPage.tsx` with latency distribution bars and component matrix | P0 |
| `TSK-023-13` | **Responsive QA & Build** | Verify strict TypeScript compilation (`npm run build`), responsive tablet/mobile viewports, and reduced-motion | P0 |
| `TSK-023-14` | **Release & Completion Report**| Author Phase 14 completion report, update Master Tracker and Changelog, seal Phase 14 | P0 |
| `TSK-023` | **Master Task** | Complete Premium Merchant Console Experience | P0 |

---

## 4. Definition of Done (DoD)

- [ ] All 7 console pages upgraded with the premium dark fintech design system.
- [ ] Framer Motion integrated with subtle, fast, non-blocking animations ($150\text{--}300\text{ ms}$).
- [ ] `prefers-reduced-motion` respected across all animations.
- [ ] Responsive design verified across desktop, tablet, and mobile breakpoints.
- [ ] Copy-to-clipboard interactions provide toast feedback.
- [ ] Strict TypeScript compilation passes with zero errors (`npm run build`).
- [ ] Backend test suite passes 100% (166/166 tests, $\ge 90\%$ coverage).
- [ ] Security scan passes with zero secrets detected.
- [ ] Local `.env` preserved and untracked.

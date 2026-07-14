# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### `artifacts/dsf-simulator` — DSF Unified Model Simulator (web, port 3001, path `/`)

Frontend-only React + Vite + TypeScript app simulating the Digital Sovereignty Fund's
unified financial / impact / theological model from the v2.5.8 working paper.

- `src/lib/dsfModel.ts` — pure-function unified model: M = rkp/(1+(k-1)p), evergreen M^c, licit/usury split (r = 1+δ+π+ρ+λ, U = 0.5ρ+λ), I = N·p·L·o·d·a·e, T = 1−U+μη, coupling functions L(U)/o(U)/d(U), wealth recursion W_{t+1} = ηW_t·M, scenario presets A–E, worked examples, and a `variableLegend` map keyed by `financial | impact | theology | company | cooperative`.
- `src/lib/companyModel.ts` — portfolio-company state vector + FCF chain + three-layer waterfall (operating → resilience reserve L* = max(L, ρ·CashOpex/12, S) → conditional γ-split with capped Red ≤ Ω = κ·ΣI). Includes archetype presets I/II/III plus the §12 illustrative example, and the steward-ownership transition I^net = I^gross − C_SO − C_inc.
- `src/lib/cooperativeModel.ts` — cooperative-level evergreen waterfall: launch stack (K_members + L_NPV → F_gross → F_deploy after setup costs and E*_0), per-period flow (Π_t → DS^NPV → Net → Reserve → ReinvestFund with E* floor → DistPool), and pro-rata-then-clipped vintage distribution with cap r·K and residual recycling.
- `src/lib/taxModel.ts` — pure tax-layer extension (does NOT modify any existing model). Types: `FundTaxMode` (equity_exempt | taxable), `RedemptionCharacter` (equity | debt_like), `TaxParams`, `TaxYearResult`, `TaxSummary`, `ScenarioResult`. Functions: `simulateWithTax()` (cooperative waterfall + dynamic fund tax + withholding), `computeTaxSummary()` (fund-level leakage only; company tax excluded since it is already embedded in FCF/redemption stream), `runScenarios()` (auto-runs Scenario A = equity-exempt vs Scenario B = debt-like with user rates), `buildSensitivityTable()` (fund tax rate 0–40% sweep).
- `src/hooks/useDsfStore.tsx` — `DsfProvider` + `useDsf()` context driving the financial/impact/theology/unified pages. The company and cooperative pages keep their own local state (no global coupling).
- `src/components/dsf/` — shared `Layout`, `Eq` (KaTeX), `ValueCard`, `SliderField`, `GuidedWalkthrough`.
- `src/pages/` — `guided` (default landing), `overview`, `financial`, `impact`, `theology`, `unified`, `company`, `cooperative`, `tax`, `glossary`.
- `src/pages/tax.tsx` — `/tax` Explore tab. Self-contained local state (TaxParams). Left rail: company tax rate (τ), instrument character toggle (Equity/Debt-like), fund tax mode toggle (Exempt/Taxable), fund tax rate, withholding tax rate. Main: narrative banner, side-by-side Scenario A vs B cards, company-level tax summary, annual distribution bar chart, cumulative distribution line chart, fund-tax-rate sensitivity table (0–40%), structuring-guide panel. Uses ILLUSTRATIVE_EXAMPLE + LAUNCH_DEFAULTS extended to 10 years.
- `src/contexts/guidedMode.tsx` — `GuidedModeProvider` + `useGuidedMode()` tracking top-level Guided/Explore toggle, active module (0–5), and current walkthrough step.
- `src/contexts/storyMode.tsx` — existing per-page Analyst/Story/Scenario/Glossary mode (unchanged, only active in Explore).
- **Guided Mode** (`/`): Landing page with 6 module cards (Survival, Repayment Cap, Impact, Repayment Timing, Cooperative Waterfall, System Coupling). Each module runs a 4-step flow: Story → Decision → Consequence → Reflection. All values come from the shared `useDsf()` store — no duplicate calculations.
- **Explore Mode** (`/explore` and all sub-pages): Unchanged. Full tabs + Analyst/Story/Scenario/Glossary toolbar. `GuidedMode` and `Explore` share the same DsfProvider state so slider changes in one are immediately visible in the other.
- Top-level `[Guided | Explore]` toggle in the header. Guided is the default landing. Explore preserves the full original experience.
- Design system: parchment palette + channel colors (finance verdigris, impact ochre, theology vermilion); Fraunces serif headings + JetBrains Mono numerics, declared in `src/index.css` and `index.html`.
- No backend, no DB, no codegen. Wouter for routing with `base={import.meta.env.BASE_URL}`.

Note: the dev script in this artifact's `package.json` is `vite dev` (not `vite --host 0.0.0.0`) — the explicit CLI host flag conflicts with Replit's port-detection probe and causes the workflow to time out. Keep host configuration in `vite.config.ts` only.

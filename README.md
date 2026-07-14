# DSF Unified Model Simulator

Interactive simulator for the **Digital Sovereignty Fund (DSF) unified model** — the financial / impact / theological model behind [Non-Extractive Capital](https://nonextractivecapital.com)'s fund design. Frontend-only React + Vite + TypeScript app; no backend, no database.

**All figures are illustrative model explorations, not projections, investment advice, or an offer of any kind.**

## What it does

The app walks through the DSF model in two modes — **Guided** (six-module narrative walkthrough) and **Explore** (full parameter workbench) — covering:

- **Financial core** — portfolio multiple M = rkp/(1+(k−1)p), evergreen compounding, licit-return vs. usury decomposition (r = 1+δ+π+ρ+λ)
- **Impact** — I = N·p·L·o·d·a·e with U-coupling on licensing, openness, and sovereignty channels
- **Theology** — usury index U, theological-mode weightings, gated repayment T
- **Company & cooperative layers** — three-layer waterfall, resilience reserve, evergreen cooperative flows, launch-stack feasibility
- **Tax layer** — fund tax modes, withholding, scenario comparison
- **Solidarity-pooling lab** — Monte-Carlo rescue simulation of a pooled reserve

The models of record are the NEC working papers *DSF Unified Model* (v2.8.x) and *DSF Portfolio Simulation Framework* (v5.x); the pure model functions live in `artifacts/dsf-simulator/src/lib/*.ts` with acceptance values documented beside what they verify.

## Repository layout

pnpm workspace monorepo (exported from a Replit workspace; simulator development now happens directly in Claude sessions). The app lives in **`artifacts/dsf-simulator`**; `lib/` holds workspace-internal packages it references. See `replit.md` for the fuller architecture notes.

## Development

Requires Node ≥ 22 and pnpm ≥ 10. The Vite config requires `PORT` and `BASE_PATH` env vars.

```sh
pnpm install --filter "./artifacts/dsf-simulator..."
cd artifacts/dsf-simulator
PORT=3001 BASE_PATH=/ pnpm run dev        # dev server
pnpm run typecheck                        # tsc --noEmit
PORT=3001 BASE_PATH=/ pnpm run build      # production build → dist/public
```

## Provenance

First commit = clean import of the 14 June 2026 workspace baseline. Subsequent commits apply audited fix packs (2 July 2026 numerical audit against the working papers), one commit per fix, acceptance numbers verified against the pure lib functions and recorded in the commit messages.

## License

[GPL-3.0](./LICENSE)

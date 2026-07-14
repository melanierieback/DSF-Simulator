// True ergodicity module (pack v2 Part II; paper §8).
//
// This is the module the Solidarity Reserve Lab was renamed to make room
// for: time-average growth rates, log-wealth trajectories, Kelly stakes,
// the cooperation theorem, and the borrower/lender simulation that yields
// φ_dyn. Everything except the Borrower & Lender Monte Carlo is EXACT
// (binomial sums in log-space) — acceptance values below are from the pack
// spec, verified 2 Jul 2026. The MC uses a seeded PRNG (mulberry32) so runs
// are reproducible; acceptance tolerance ±0.5pp at 1e5 paths.

// ── Seeded PRNG ──────────────────────────────────────────────────────────────

/** mulberry32 — small fast seeded PRNG; adequate for MC illustration. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Exact binomial machinery (log-space; good to n = 1000+) ────────────────

const LN_FACT: number[] = [0];
function lnFact(n: number): number {
  for (let i = LN_FACT.length; i <= n; i++) LN_FACT.push(LN_FACT[i - 1] + Math.log(i));
  return LN_FACT[n];
}

/** ln C(n,k) + k ln p + (n−k) ln(1−p) */
export function logBinomPmf(n: number, k: number, p: number): number {
  if (p <= 0) return k === 0 ? 0 : -Infinity;
  if (p >= 1) return k === n ? 0 : -Infinity;
  return (
    lnFact(n) - lnFact(k) - lnFact(n - k) + k * Math.log(p) + (n - k) * Math.log(1 - p)
  );
}

export function binomPmf(n: number, k: number, p: number): number {
  return Math.exp(logBinomPmf(n, k, p));
}

/** P(X ≥ kMin), X ~ Bin(n, p) — exact tail sum */
export function binomTail(n: number, kMin: number, p: number): number {
  let s = 0;
  for (let k = Math.max(0, Math.ceil(kMin)); k <= n; k++) s += binomPmf(n, k, p);
  return Math.min(1, s);
}

// ── II.1 Two Averages: the +50%/−40% coin toss ──────────────────────────────
//
// Acceptance: ⟨f⟩ = 1.05; g = ½ln(1.5·0.6) = ½ln0.9 = −5.27%/round;
// mean at T=100 = 1.05^100 = 131.5×; median = 0.9^50 = 0.005×;
// P(ahead) at T = 10/100/1000 = 37.7% / 13.6% / 0.01% (exact binomial).

export const COIN_UP = 1.5;
export const COIN_DOWN = 0.6;

export function coinTossStats() {
  const meanPerRound = (COIN_UP + COIN_DOWN) / 2; // 1.05
  const g = 0.5 * Math.log(COIN_UP * COIN_DOWN); // ½ ln 0.9
  return { meanPerRound, g };
}

/** Ensemble mean and median trajectories over T rounds (exact). */
export function coinTossTrajectories(T: number) {
  const rows: { t: number; mean: number; median: number }[] = [];
  for (let t = 0; t <= T; t++) {
    rows.push({
      t,
      mean: Math.pow(1.05, t),
      // median path: half up, half down → (1.5·0.6)^(t/2) = 0.9^(t/2)
      median: Math.pow(0.9, t / 2),
    });
  }
  return rows;
}

/** P(V_T > 1) exactly: wins needed W s.t. 1.5^W · 0.6^(T−W) > 1. */
export function coinTossPAhead(T: number): number {
  const wMin = Math.floor((T * Math.log(1 / COIN_DOWN)) / Math.log(COIN_UP / COIN_DOWN)) + 1;
  return binomTail(T, wMin, 0.5);
}

// ── II.2 Fund Kelly: the fund's own time-average growth ────────────────────
//
// Ŝ ~ Bin(N, p); M̂ = rkŜ / (N + (k−1)Ŝ).
// Acceptance (N=25, p=0.4, k=5, r=3, η=1): E[ln M̂ | Ŝ≥1] = 0.8152
// (typical factor 2.260), drag = ln M − E[ln M̂ | Ŝ≥1] = 0.0211,
// P(all fail) = 2.8×10⁻⁶. Drag at N = 10/25/40/100/400 =
// 0.0549/0.0211/0.0125/0.0048/0.0012. Honest evergreen at c=3:
// M³ = 12.29× reported vs e^{gc} ≈ 11.5× typical.

export type FundKellyResult = {
  M: number;
  lnM: number;
  ElnMcond: number; // E[ln M̂ | Ŝ ≥ 1]
  typicalFactor: number; // e^{E[ln M̂ | Ŝ≥1]}
  drag: number;
  pAllFail: number;
  g: number; // ln η + E[ln M̂ | Ŝ ≥ 1]
};

export function realizedMultiple(N: number, k: number, r: number, S: number): number {
  return (r * k * S) / (N + (k - 1) * S);
}

export function fundKelly(N: number, p: number, k: number, r: number, eta: number): FundKellyResult {
  const M = (r * k * p) / (1 + (k - 1) * p);
  const lnM = Math.log(M);
  const pAllFail = Math.pow(1 - p, N);
  let num = 0;
  for (let S = 1; S <= N; S++) {
    num += binomPmf(N, S, p) * Math.log(realizedMultiple(N, k, r, S));
  }
  const ElnMcond = num / (1 - pAllFail);
  const drag = lnM - ElnMcond;
  return {
    M,
    lnM,
    ElnMcond,
    typicalFactor: Math.exp(ElnMcond),
    drag,
    pAllFail,
    g: Math.log(eta) + ElnMcond,
  };
}

/** g(f) = E[ln((1−f) + f·η·M̂)] over the FULL Ŝ distribution (Ŝ=0 included). */
export function fundGOfF(N: number, p: number, k: number, r: number, eta: number, f: number): number {
  let s = 0;
  for (let S = 0; S <= N; S++) {
    const Mhat = S === 0 ? 0 : realizedMultiple(N, k, r, S);
    const w = 1 - f + f * eta * Mhat;
    s += binomPmf(N, S, p) * (w > 0 ? Math.log(w) : -Infinity);
  }
  return s;
}

/** argmax over a grid (fine enough for display + f★ marker). */
export function fundFStar(N: number, p: number, k: number, r: number, eta: number): { fStar: number; gStar: number } {
  let best = { fStar: 0, gStar: -Infinity };
  for (let i = 0; i <= 200; i++) {
    const f = i / 200;
    const g = fundGOfF(N, p, k, r, eta, f);
    if (g > best.gStar) best = { fStar: f, gStar: g };
  }
  return best;
}

/** Coin-toss reference stake curve: g(f) = ½ln(1+0.5f) + ½ln(1−0.4f).
 *  Acceptance: f★ = 0.25, g(f★) = +0.62%/round, g(0.5) = 0, g(1) = −5.27%. */
export function coinGOfF(f: number): number {
  return 0.5 * Math.log(1 + 0.5 * f) + 0.5 * Math.log(1 - 0.4 * f);
}

// ── II.3 Pooling: the cooperation theorem ───────────────────────────────────
//
// n sharers of the coin toss: g_n = E[ln(0.6 + 0.9·U/n)], U ~ Bin(n, ½).
// Acceptance: n = 1/2/5/10/25/100 →
// −5.27% / −0.20% / +2.95% / +3.94% / +4.51% / +4.79%; limit ln(1.05) = +4.88%.

export function poolingGn(n: number): number {
  let s = 0;
  for (let u = 0; u <= n; u++) {
    s += binomPmf(n, u, 0.5) * Math.log(COIN_DOWN + ((COIN_UP - COIN_DOWN) * u) / n);
  }
  return s;
}

export const POOLING_LIMIT = Math.log(1.05);

// ── II.4 Borrower & Lender: delivers φ_dyn ──────────────────────────────────
//
// Borrower V₀ = 1, f ∈ {1.5, 0.75} equiprobable per year, obligation Ω = 0.8,
// horizon 25y. (A) fixed: pay 0.10/yr until cum = Ω; ruin (absorbing, V = 0)
// if V < payment. (B) conditional (DSF): pay min(0.3 × up-year gain,
// headroom); nothing in down years. Sequence: the business grows first
// (V ← V·f), then the year's payment is due.
//
// Acceptance (10⁵ paths, ±0.5pp MC tolerance):
//   ruined 25.0% / 0.0%; fully repaid 75.0% / 81.1%; median years to repay
//   8 / 10; median V₂₅ (ruined = 0) 1.00 / 2.11; median-path growth
//   +0.0%/yr / +3.0%/yr; lender collects (mean) 0.751 / 0.742.
//   Free company: median V₂₅ = 3.08 (g_med +4.5%/yr).
//   Δg_A = 4.5pp, Δg_B = 1.5pp, φ_dyn = 1 − Δg_B/Δg_A ≈ 0.66.

export const BL_UP = 1.5;
export const BL_DOWN = 0.75;
export const BL_OMEGA = 0.8;
export const BL_HORIZON = 25;
export const BL_FIXED_PAYMENT = 0.1;
export const BL_CONDITIONAL_SHARE = 0.3;

export type BLVariant = {
  ruined: number;
  fullyRepaid: number;
  medianYearsToRepay: number | null;
  medianV: number; // ruined paths count as 0
  medianPathGrowth: number; // ln(medianV)/T for medianV > 0, else −∞ → reported as g of median V
  lenderCollects: number;
};

export type BLResult = {
  A: BLVariant;
  B: BLVariant;
  freeMedianV: number;
  freeMedianGrowth: number;
  dgA: number;
  dgB: number;
  phiDyn: number;
  paths: number;
  seed: number;
};

function median(sorted: number[]): number {
  const n = sorted.length;
  return n % 2 ? sorted[(n - 1) / 2] : 0.5 * (sorted[n / 2 - 1] + sorted[n / 2]);
}

export function runBorrowerLender(paths = 100_000, seed = 20260702): BLResult {
  const rand = mulberry32(seed);

  const vA: number[] = [];
  const vB: number[] = [];
  const vFree: number[] = [];
  const yearsA: number[] = [];
  const yearsB: number[] = [];
  let ruinedA = 0;
  let repaidA = 0;
  let repaidB = 0;
  let collectA = 0;
  let collectB = 0;

  for (let i = 0; i < paths; i++) {
    // one shared shock sequence per path → paired comparison
    const ups: boolean[] = [];
    for (let t = 0; t < BL_HORIZON; t++) ups.push(rand() < 0.5);

    // Free company
    let vf = 1;
    for (let t = 0; t < BL_HORIZON; t++) vf *= ups[t] ? BL_UP : BL_DOWN;
    vFree.push(vf);

    // (A) fixed schedule
    {
      let v = 1;
      let cum = 0;
      let ruined = false;
      let repaidYear: number | null = null;
      for (let t = 0; t < BL_HORIZON; t++) {
        v *= ups[t] ? BL_UP : BL_DOWN;
        if (!ruined && cum < BL_OMEGA - 1e-12) {
          const due = Math.min(BL_FIXED_PAYMENT, BL_OMEGA - cum);
          if (v < due) {
            // Ruin: the lender seizes what remains as a partial final
            // payment; V = 0 is absorbing. (Matches the reference numbers:
            // lender collects 0.751 in A, not 0.739 without seizure.)
            cum += v;
            ruined = true;
            v = 0;
            break;
          }
          v -= due;
          cum += due;
          if (cum >= BL_OMEGA - 1e-12 && repaidYear === null) repaidYear = t + 1;
        }
      }
      collectA += cum;
      if (ruined) ruinedA++;
      else if (repaidYear !== null) {
        repaidA++;
        yearsA.push(repaidYear);
      }
      vA.push(v);
    }

    // (B) conditional (DSF)
    {
      let v = 1;
      let cum = 0;
      let repaidYear: number | null = null;
      for (let t = 0; t < BL_HORIZON; t++) {
        const before = v;
        v *= ups[t] ? BL_UP : BL_DOWN;
        if (cum < BL_OMEGA - 1e-12 && ups[t]) {
          const gain = v - before;
          const pay = Math.min(BL_CONDITIONAL_SHARE * gain, BL_OMEGA - cum);
          v -= pay;
          cum += pay;
          if (cum >= BL_OMEGA - 1e-12 && repaidYear === null) repaidYear = t + 1;
        }
      }
      collectB += cum;
      if (repaidYear !== null) {
        repaidB++;
        yearsB.push(repaidYear);
      }
      vB.push(v);
    }
  }

  vA.sort((a, b) => a - b);
  vB.sort((a, b) => a - b);
  vFree.sort((a, b) => a - b);
  yearsA.sort((a, b) => a - b);
  yearsB.sort((a, b) => a - b);

  const medA = median(vA);
  const medB = median(vB);
  const medFree = median(vFree);
  const gA = medA > 0 ? Math.log(medA) / BL_HORIZON : NaN;
  const gB = medB > 0 ? Math.log(medB) / BL_HORIZON : NaN;
  const gFree = Math.log(medFree) / BL_HORIZON;
  const dgA = gFree - gA;
  const dgB = gFree - gB;

  return {
    A: {
      ruined: ruinedA / paths,
      fullyRepaid: repaidA / paths,
      medianYearsToRepay: yearsA.length ? median(yearsA) : null,
      medianV: medA,
      medianPathGrowth: gA,
      lenderCollects: collectA / paths,
    },
    B: {
      ruined: 0,
      fullyRepaid: repaidB / paths,
      medianYearsToRepay: yearsB.length ? median(yearsB) : null,
      medianV: medB,
      medianPathGrowth: gB,
      lenderCollects: collectB / paths,
    },
    freeMedianV: medFree,
    freeMedianGrowth: gFree,
    dgA,
    dgB,
    phiDyn: 1 - dgB / dgA,
    paths,
    seed,
  };
}

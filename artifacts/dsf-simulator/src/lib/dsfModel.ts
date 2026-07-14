export type DsfParams = {
  N: number;
  p: number;
  k: number;
  delta: number;
  pi: number;
  rho: number;
  lambda: number;
  rDirect: number;
  composeR: boolean;
  L0: number;
  o0: number;
  d0: number;
  a: number;
  e: number;
  alpha: number;
  beta: number;
  gamma: number;
  mu: number;
  eta: number;
  c: number;
  yearsPerCycle: number;
  stewardOwnership: boolean;
  openSource: boolean;
  euRetention: boolean;
  Fmin: number;
  Tmin: number;
  Imin: number;
  rVC: number;
  If: number;
  Trepay: number;
  Cops: number;
  fundSize: number;
  m: number;
  Lloan: number;
  iLoan: number;
  Tloan: number;
  dLP: number;
  /** Ergodicity extension: whether the MC-derived effective survival rate
   *  feeds back into the main model results. Default OFF. */
  includeErgodicityInResults: boolean;
  /** Ergodicity extension: MC-derived mean survival rate with pooled reserve.
   *  Written by the Solidarity Reserve Lab page when a simulation completes.
   *  Used in computeAll when includeErgodicityInResults is true. */
  ergodicEffectiveSurvivalRate: number;
  /** Theological mode for computing usury pressure U and the licit/usury M split.
   *  Canonical keys: aquinas_unified | olivi | salamanca_late. Legacy keys
   *  (dsf_working, aquinas_mutuum, aquinas_societas, salamanca) are accepted
   *  as ALIASES for URL back-compat and resolve via resolveTheologicalMode().
   *  Default "aquinas_unified" with phi = 0.5 reproduces every legacy
   *  dsf_working number exactly. */
  theologicalMode: string;
  // ── Pack v2 Part I — generalized theology layer (paper §§4.5–4.11) ──
  /** Claim contingency ∈ [0,1]; 0.5 = legacy baseline (exact backward compat).
   *  φ_state is the OPERATIVE φ (founder decision, 2 Jul 2026); the dynamic
   *  φ_dyn from the ergodicity module is display-only. */
  phi: number;
  /** Substantiation of δ ∈ [0,1] (unsubstantiated share flows into D) */
  psiDelta: number;
  /** Substantiation of π ∈ [0,1] */
  psiPi: number;
  /** Substantiation of ρ ∈ [0,1] */
  psiRho: number;
  /** Substantiation of λ ∈ [0,1] */
  psiLambda: number;
  /** Licitness gate for T (founder decision, 2 Jul 2026): U > Umax ⇒ T = 0 */
  Umax: number;
  // verdict-layer inputs (paper §§4.8–4.10):
  /** Olivi committed-capital threshold on φ */
  phiMin: number;
  /** Time-average growth of the counterfactual (operative Λ_time) */
  gAlt: number;
  /** Ensemble mean of the counterfactual (comparison Λ_ens) */
  yAlt: number;
  /** Horizon for Λ and the Salamanca band (default = yearsPerCycle) */
  TLambda: number;
  /** Salamanca just rate */
  rStar: number;
  /** Salamanca band tolerance */
  epsBand: number;
  /** Screen: no pricing against borrower's necessity */
  screenNecessity: boolean;
  /** Screen: no market power */
  screenMarketPower: boolean;
  /** Substantiation screen threshold: min(ψ_i) ≥ psiMin */
  psiMin: number;
};

export const DEFAULTS: DsfParams = {
  N: 25,
  p: 0.4,
  k: 5,
  delta: 1.3,
  pi: 0.2,
  rho: 0.3,
  lambda: 0.1,
  rDirect: 2.9,
  composeR: true,
  L0: 8,
  o0: 1.0,
  d0: 1.0,
  a: 2.0,
  e: 1.2,
  alpha: 0.2,
  beta: 0.15,
  gamma: 0.2,
  mu: 1.0,
  eta: 0.7,
  c: 3,
  yearsPerCycle: 10,
  stewardOwnership: true,
  openSource: true,
  euRetention: true,
  Fmin: 1.5,
  Tmin: 0.8,
  Imin: 100,
  rVC: 0.05,
  If: 50000,
  Trepay: 7,
  Cops: 800000,
  fundSize: 25000000,
  m: 0.02,
  Lloan: 0,
  iLoan: 0.04,
  Tloan: 10,
  dLP: 0.5,
  includeErgodicityInResults: false,
  ergodicEffectiveSurvivalRate: 0.4,
  theologicalMode: "aquinas_unified",
  // Pack v2 I.1 — generalized theology layer defaults (all values from the
  // pack spec, verified against paper v2.8.2 on 2 Jul 2026):
  phi: 0.5, // legacy baseline: aquinas_unified @ φ=0.5 ≡ old dsf_working
  psiDelta: 1.0,
  psiPi: 1.0,
  psiRho: 1.0,
  psiLambda: 1.0,
  Umax: 0.8,
  phiMin: 0.6,
  gAlt: 0.04,
  yAlt: 0.05,
  TLambda: 10, // = yearsPerCycle default
  rStar: 0.05,
  epsBand: 0.02,
  screenNecessity: true,
  screenMarketPower: true,
  psiMin: 0.8,
};

export const clamp = (x: number, lo = 0, hi = Infinity) =>
  Math.max(lo, Math.min(hi, x));

export const computeR = (params: Pick<DsfParams, "delta" | "pi" | "rho" | "lambda" | "rDirect" | "composeR">) =>
  params.composeR
    ? 1 + params.delta + params.pi + params.rho + params.lambda
    : params.rDirect;

export const computeM = (r: number, k: number, p: number) =>
  (r * k * p) / (1 + (k - 1) * p);

export const computeMLicit = (
  delta: number,
  pi: number,
  k: number,
  p: number,
) => ((1 + delta + pi) * k * p) / (1 + (k - 1) * p);

export const computeMUsury = (
  rho: number,
  lambda: number,
  k: number,
  p: number,
) => ((rho + lambda) * k * p) / (1 + (k - 1) * p);

export const computeU = (rho: number, lambda: number) => 0.5 * rho + lambda;

// ── Theological modes ─────────────────────────────────────────────────────
//
// The schools differ on WHICH title is suspect, not merely on one permissiveness
// level.  Aquinas is strict on lucrum cessans but can be lenient on genuine
// partnership risk.  Olivi and Salamanca progressively accept lucrum cessans.
// That is why this is a per-mode weight vector, not a single strict→permissive slider.
//
// w_delta = 0 and w_pi = 0 in every mode: damnum emergens (real costs) and a
// genuine proportional penalty are treated as licit across the tradition.
// All four weights are retained in the structure for extensibility.

export type TheologicalModeKey =
  | "aquinas_unified"
  | "olivi"
  | "salamanca_late";

export type TheologicalModeConfig = {
  key: TheologicalModeKey;
  label: string;
  wDelta: number;
  wPi: number;
  wRho: number;
  wLambda: number;
  /** Scholarly uncertainty range on w_ρ (endpoints drive the displayed U-band) */
  rangeRho?: [number, number];
  /** Scholarly uncertainty range on w_λ */
  rangeLambda?: [number, number];
  rationale: string;
  source: string;
};

export const THEOLOGICAL_MODES: TheologicalModeConfig[] = [
  {
    key: "aquinas_unified",
    label: "Aquinas (unified)",
    wDelta: 0, wPi: 0, wRho: 1.0, wLambda: 1.0,
    rationale: "φ-aware Thomistic test spanning the old mutuum/societas poles: at φ = 0 (fully non-contingent claim) it is the strict loan reading; at φ = 1 (fully contingent) genuine partnership risk-bearing legitimates the ρ claim. φ = 0.5 reproduces the old DSF working baseline exactly.",
    source: "Aquinas, Summa Theologiae II-II q.78: damnum emergens admitted; lucrum cessans refused; a return is licit where the capital provider shares the venture's risk as a partner rather than receiving a guaranteed return as a lender.",
  },
  {
    key: "olivi",
    label: "Olivi — committed capital",
    wDelta: 0, wPi: 0, wRho: 0.25, wLambda: 0.50,
    rangeRho: [0.2, 0.4],
    rangeLambda: [0.4, 0.6],
    rationale: "Capital genuinely committed to productive use has a profit-bearing quality; lucrum cessans accepted conditionally. Intermediate between Thomistic and Salamanca positions.",
    source: "Peter John Olivi, Tractatus de contractibus: capital committed to productive trade has a profit-bearing quality; risk and productive commitment give rise to legitimate interesse.",
  },
  {
    key: "salamanca_late",
    label: "Salamanca & late scholastics",
    wDelta: 0, wPi: 0, wRho: 0.15, wLambda: 0.25,
    rangeRho: [0.1, 0.3],
    rangeLambda: [0.2, 0.4],
    rationale: "Progressive legitimation of lucrum cessans and periculum sortis when priced by common estimation and real market conditions. Most permissive row; may split into Salamanca proper vs late scholastics after the primary-source pass.",
    source: "Salamanca proper: Vitoria, de Soto, Azpilcueta (Comentario resolutorio de usuras, 1556), Mercado. Late scholastics: Molina (1593), Lessius (1605), de Lugo (1642).",
  },
];

/** Legacy mode keys accepted as aliases so old shared URLs never break
 *  (pack v2 I.2). aquinas_mutuum/societas force φ to their pole. */
export const THEOLOGICAL_MODE_ALIASES: Record<
  string,
  { mode: TheologicalModeKey; forcePhi?: number }
> = {
  dsf_working: { mode: "aquinas_unified" }, // leave phi as-is (default 0.5)
  aquinas_mutuum: { mode: "aquinas_unified", forcePhi: 0 },
  aquinas_societas: { mode: "aquinas_unified", forcePhi: 1 },
  salamanca: { mode: "salamanca_late" },
};

/** Resolve any mode key (canonical or legacy alias) to its config plus the
 *  effective φ. Unknown keys fall back to aquinas_unified silently. */
export function resolveTheologicalMode(
  key: string,
  phi: number,
): { config: TheologicalModeConfig; phi: number } {
  const alias = THEOLOGICAL_MODE_ALIASES[key];
  const canonical = alias ? alias.mode : key;
  const config =
    THEOLOGICAL_MODES.find((m) => m.key === canonical) ?? THEOLOGICAL_MODES[0];
  return { config, phi: alias?.forcePhi ?? phi };
}

/** Returns the config for a given theological mode key (alias-aware).
 *  Falls back silently to 'aquinas_unified' for unknown or absent keys. */
export function getTheologicalModeConfig(key: string): TheologicalModeConfig {
  return resolveTheologicalMode(key, 0).config;
}

/** Generalized mode-aware usury pressure (pack v2 I.3, paper §4.6).
 *
 *  D = (1−ψ_δ)δ + (1−ψ_π)π + (1−ψ_ρ)ρ + (1−ψ_λ)λ   (unsubstantiated claim)
 *  U = w_ρ·(1−φ)·(ψ_ρ·ρ) + w_λ·(ψ_λ·λ + D)
 *  (w_δ = w_π = 0 across modes; enforcement lives in ψ.)
 *
 *  φ_state (params.phi) is the OPERATIVE φ; φ_dyn from the ergodicity module
 *  is display-only and never feeds U.
 *
 *  Acceptance (δ=0.9, π=0.2, ρ=0.5, λ=0.3, ψ≡1) — verified 2 Jul 2026:
 *    φ=0.0 → aquinas_unified 0.8000 (= old mutuum) · olivi 0.2750 · salamanca_late 0.1500
 *    φ=0.5 → aquinas_unified 0.5500 (= old dsf_working) · olivi 0.2125 · salamanca_late 0.1125
 *    φ=0.9 → 0.3500 · 0.1625 · 0.0825
 *    φ=1.0 → aquinas_unified 0.3000 (= old societas) · olivi 0.1500 · salamanca_late 0.0750
 *  With ψ_δ=0.75 (D=0.225), φ=0.9 → 0.5750 / 0.2750 / 0.1388.
 *  The φ ∈ {0, 0.5, 1} column of aquinas_unified is the three-point
 *  regression test against the old five-mode system.
 */
export function computeUsuryByMode(
  delta: number,
  pi: number,
  rho: number,
  lambda: number,
  theologicalMode: string,
  phi: number,
  psiDelta = 1,
  psiPi = 1,
  psiRho = 1,
  psiLambda = 1,
): number {
  const { config: m, phi: phiEff } = resolveTheologicalMode(theologicalMode, phi);
  const D =
    (1 - psiDelta) * delta +
    (1 - psiPi) * pi +
    (1 - psiRho) * rho +
    (1 - psiLambda) * lambda;
  return m.wRho * (1 - phiEff) * (psiRho * rho) + m.wLambda * (psiLambda * lambda + D);
}

/** U recomputed at the mode's scholarly range endpoints (pack v2 I.3:
 *  "display U with its band"). Modes without ranges return a point band. */
export function computeUsuryBandByMode(
  delta: number,
  pi: number,
  rho: number,
  lambda: number,
  theologicalMode: string,
  phi: number,
  psiDelta = 1,
  psiPi = 1,
  psiRho = 1,
  psiLambda = 1,
): { lo: number; hi: number } {
  const { config: m, phi: phiEff } = resolveTheologicalMode(theologicalMode, phi);
  const D =
    (1 - psiDelta) * delta +
    (1 - psiPi) * pi +
    (1 - psiRho) * rho +
    (1 - psiLambda) * lambda;
  const wRhos = m.rangeRho ?? [m.wRho, m.wRho];
  const wLams = m.rangeLambda ?? [m.wLambda, m.wLambda];
  const vals: number[] = [];
  for (const wr of wRhos) {
    for (const wl of wLams) {
      vals.push(wr * (1 - phiEff) * (psiRho * rho) + wl * (psiLambda * lambda + D));
    }
  }
  return { lo: Math.min(...vals), hi: Math.max(...vals) };
}

/** Mode-weighted usury component of M (display-only — does not change M).
 *  Substantiation- and contingency-aware (pack v2 I.7):
 *  M_usury_mode = U_mode · kp / (1+(k-1)p)  with the generalized U.
 */
export function computeMUsuryMode(
  rho: number,
  lambda: number,
  k: number,
  p: number,
  theologicalMode: string,
  phi: number,
  delta = 0,
  pi = 0,
  psiDelta = 1,
  psiPi = 1,
  psiRho = 1,
  psiLambda = 1,
): number {
  const U = computeUsuryByMode(
    delta, pi, rho, lambda, theologicalMode, phi, psiDelta, psiPi, psiRho, psiLambda,
  );
  return (U * k * p) / (1 + (k - 1) * p);
}

/** Mode-weighted licit component of M (display-only).
 *  M_licit_mode = M − M_usury_mode = (r − U_mode) · kp / (1+(k-1)p)
 */
export function computeMLicitMode(
  delta: number,
  pi: number,
  rho: number,
  lambda: number,
  k: number,
  p: number,
  theologicalMode: string,
  phi: number,
  psiDelta = 1,
  psiPi = 1,
  psiRho = 1,
  psiLambda = 1,
): number {
  const r = 1 + delta + pi + rho + lambda;
  const U = computeUsuryByMode(
    delta, pi, rho, lambda, theologicalMode, phi, psiDelta, psiPi, psiRho, psiLambda,
  );
  return ((r - U) * k * p) / (1 + (k - 1) * p);
}

/** Returns U (with band) and gated T under all three modes for the current
 *  cap composition. Used by the cross-mode comparison panel (pack v2 I.7). */
export function computeTheologicalModeComparison(
  delta: number,
  pi: number,
  rho: number,
  lambda: number,
  mu: number,
  eta: number,
  phi: number,
  Umax: number,
  psiDelta = 1,
  psiPi = 1,
  psiRho = 1,
  psiLambda = 1,
) {
  return THEOLOGICAL_MODES.map((mode) => {
    const U = computeUsuryByMode(
      delta, pi, rho, lambda, mode.key, phi, psiDelta, psiPi, psiRho, psiLambda,
    );
    const band = computeUsuryBandByMode(
      delta, pi, rho, lambda, mode.key, phi, psiDelta, psiPi, psiRho, psiLambda,
    );
    const T = computeT(U, mu, eta, Umax);
    return {
      key: mode.key,
      label: mode.label,
      wRho: mode.wRho,
      wLambda: mode.wLambda,
      U,
      Ulo: band.lo,
      Uhi: band.hi,
      T,
      rationale: mode.rationale,
      source: mode.source,
    };
  });
}

/** Gated integrity score (pack v2 I.4, paper §4.7; U_max = founder decision
 *  2 Jul 2026). Coincides with the old 1−U+μη at U = 0.
 *  Acceptance (μ=1, η=0.7, U_max=0.8): U=0 → 1.700; U=0.25 → 1.231;
 *  U=0.55 → 0.669; U=0.85 → 0; U=1.10 → 0. Scenario C now FAILS T ≥ 0.8
 *  by design. */
export const computeT = (U: number, mu: number, eta: number, Umax: number) =>
  U > Umax ? 0 : 1 - U + mu * eta * (1 - U / Umax);

export const computeLU = (L0: number, alpha: number, U: number) =>
  clamp(L0 * (1 - alpha * U), 0);

export const computeOU = (
  o0: number,
  beta: number,
  U: number,
  forced: boolean,
) => (forced ? 1 : clamp(o0 * (1 - beta * U), 0, 1));

export const computeDU = (
  d0: number,
  gamma: number,
  U: number,
  forced: boolean,
) => (forced ? 1 : clamp(d0 * (1 - gamma * U), 0, 1));

export const computeImpact = (
  N: number,
  p: number,
  L: number,
  o: number,
  d: number,
  a: number,
  e: number,
) => N * p * L * o * d * a * e;

export const evergreenWealthSeries = (
  M: number,
  eta: number,
  c: number,
  W0 = 100,
) => {
  const out: { cycle: number; wealth: number }[] = [{ cycle: 0, wealth: W0 }];
  let w = W0;
  for (let t = 1; t <= c; t++) {
    w = eta * w * M;
    out.push({ cycle: t, wealth: w });
  }
  return out;
};

export const vcBenchmarkSeries = (
  rVC: number,
  c: number,
  yearsPerCycle: number,
  W0 = 100,
) => {
  const out: { cycle: number; wealth: number }[] = [];
  for (let t = 0; t <= c; t++) {
    out.push({ cycle: t, wealth: W0 * Math.pow(1 + rVC, t * yearsPerCycle) });
  }
  return out;
};

export type Derived = {
  r: number;
  M: number;
  /** Legacy split: M_licit = (1+δ+π)·kp/(1+(k-1)p). Display-only. */
  Mlicit: number;
  /** Legacy split: M_usury = (ρ+λ)·kp/(1+(k-1)p). Display-only. */
  Musury: number;
  /** Mode-weighted licit component. Display-only; does not affect M. */
  MlicitMode: number;
  /** Mode-weighted usury component. Display-only; does not affect M. */
  MusuryMode: number;
  U: number;
  T: number;
  L: number;
  o: number;
  d: number;
  I: number;
  Itotal: number;
  Mtotal: number;
  S: number;
  F: number;
  Investment: number;
  Repayment: number;
  Ryear: number;
  Cmgmt: number;
  LoanYear: number;
  CashYear: number;
  Recycle: number;
  forcedOpenness: boolean;
  forcedSovereignty: boolean;
};

export const computeAll = (params: DsfParams): Derived => {
  // When the pooling toggle is ON, route survival-dependent calculations
  // through the MC-derived effective survival rate instead of the raw slider.
  // The original `p` slider is preserved and never overwritten.
  const effectiveP = params.includeErgodicityInResults
    ? params.ergodicEffectiveSurvivalRate
    : params.p;

  const r = computeR(params);
  const M = computeM(r, params.k, effectiveP);
  const Mlicit = computeMLicit(params.delta, params.pi, params.k, effectiveP);
  const Musury = computeMUsury(params.rho, params.lambda, params.k, effectiveP);
  // Mode-weighted licit/usury split — display-only, does not change M.
  const MlicitMode = computeMLicitMode(
    params.delta, params.pi, params.rho, params.lambda, params.k, effectiveP,
    params.theologicalMode, params.phi,
    params.psiDelta, params.psiPi, params.psiRho, params.psiLambda,
  );
  const MusuryMode = computeMUsuryMode(
    params.rho, params.lambda, params.k, effectiveP,
    params.theologicalMode, params.phi, params.delta, params.pi,
    params.psiDelta, params.psiPi, params.psiRho, params.psiLambda,
  );
  // Generalized U (pack v2 I.3): aquinas_unified @ φ=0.5, ψ≡1 reproduces the
  // original 0.5·ρ + λ exactly.
  const U = computeUsuryByMode(
    params.delta, params.pi, params.rho, params.lambda,
    params.theologicalMode, params.phi,
    params.psiDelta, params.psiPi, params.psiRho, params.psiLambda,
  );
  const T = computeT(U, params.mu, params.eta, params.Umax);
  const L = computeLU(params.L0, params.alpha, U);
  const forcedOS = params.openSource;
  const forcedSov = params.stewardOwnership && params.euRetention;
  const o = computeOU(params.o0, params.beta, U, forcedOS);
  const d = computeDU(params.d0, params.gamma, U, forcedSov);
  const I = computeImpact(params.N, effectiveP, L, o, d, params.a, params.e);
  const Itotal = I * params.c;
  const Mtotal = Math.pow(M, params.c);
  const S = Math.round(effectiveP * params.N);
  const F = params.N - S;
  const Investment = params.If * (F + params.k * S);
  const Repayment = r * params.k * params.If * S;
  const Ryear = Repayment / params.Trepay;
  const Cmgmt = params.m * params.fundSize;
  const LoanYear =
    params.Lloan > 0 ? (params.Lloan * (1 + params.iLoan)) / params.Tloan : 0;
  const CashYear = Ryear - params.Cops - Cmgmt - LoanYear;
  const Recycle = (1 - params.dLP) * Math.max(CashYear, 0);
  return {
    r,
    M,
    Mlicit,
    Musury,
    MlicitMode,
    MusuryMode,
    U,
    T,
    L,
    o,
    d,
    I,
    Itotal,
    Mtotal,
    S,
    F,
    Investment,
    Repayment,
    Ryear,
    Cmgmt,
    LoanYear,
    CashYear,
    Recycle,
    forcedOpenness: forcedOS,
    forcedSovereignty: forcedSov,
  };
};

export type TheologyScenario = {
  id: "A" | "B" | "C" | "D" | "E";
  name: string;
  delta: number;
  pi: number;
  rho: number;
  lambda: number;
  tendency: string;
  /** LEGACY/reference only — the working paper's printed table value.
   *  UI badges show the live computed I instead (Fix 2); early printings
   *  (451/417/351/289/244) did not follow from the paper's own formulas
   *  and were corrected in v2.5.9 to 448/400/335/277/234. */
  approxImpact: number;
  tone: "good" | "ok" | "warn" | "bad" | "very-bad";
};

export const THEOLOGY_SCENARIOS: TheologyScenario[] = [
  {
    id: "A",
    name: "Strongly licit",
    delta: 1.6,
    pi: 0.2,
    rho: 0.1,
    lambda: 0.0,
    tendency: "Very high",
    approxImpact: 451,
    tone: "good",
  },
  {
    id: "B",
    name: "Mostly licit",
    delta: 1.3,
    pi: 0.2,
    rho: 0.3,
    lambda: 0.1,
    tendency: "High",
    approxImpact: 417,
    tone: "ok",
  },
  {
    id: "C",
    name: "Mixed",
    delta: 0.9,
    pi: 0.2,
    rho: 0.5,
    lambda: 0.3,
    tendency: "Moderate",
    approxImpact: 351,
    tone: "warn",
  },
  {
    id: "D",
    name: "Extractive drift",
    delta: 0.6,
    pi: 0.1,
    rho: 0.7,
    lambda: 0.5,
    tendency: "Lower",
    approxImpact: 289,
    tone: "bad",
  },
  {
    id: "E",
    name: "Highly usurious",
    delta: 0.3,
    pi: 0.1,
    rho: 0.8,
    lambda: 0.7,
    tendency: "Much lower",
    approxImpact: 244,
    tone: "very-bad",
  },
];

export const SCENARIO_BASE: Partial<DsfParams> = {
  N: 40,
  p: 0.6,
  k: 5,
  L0: 8,
  o0: 1,
  d0: 1,
  a: 2,
  e: 1.2,
  alpha: 0.2,
  beta: 0.15,
  gamma: 0.2,
  composeR: true,
  // Structural guarantees are deliberately RELAXED in the theology
  // scenarios so the U-coupling on openness (o) and sovereignty (d) is
  // visible — with them true, computeAll forces o = 1 and d = 1 and two
  // of the three coupling channels are bypassed.
  // Acceptance (dsf_working defaults): I(A–E) = 448/400/335/277/234 (±1),
  // M = 2.56 for all five (working paper v2.5.9 table).
  stewardOwnership: false,
  openSource: false,
  euRetention: false,
};

export type WorkedExample = {
  id: string;
  name: string;
  description: string;
  patch: Partial<DsfParams>;
  expected: { multiple: number; investmentEUR: number; repaymentEUR: number };
};

export const WORKED_EXAMPLES: WorkedExample[] = [
  {
    id: "A-10",
    name: "Case A · 10 of 25 succeed",
    description: "I_f = €25k, I_s = €100k (k=4), r=3, p=0.40",
    patch: {
      N: 25,
      p: 0.4,
      k: 4,
      composeR: false,
      rDirect: 3,
      If: 25000,
    },
    expected: {
      multiple: 2.18,
      investmentEUR: 1_375_000,
      repaymentEUR: 3_000_000,
    },
  },
  {
    id: "A-15",
    name: "Case A · 15 of 25 succeed",
    description: "I_f = €25k, I_s = €100k (k=4), r=3, p=0.60",
    patch: {
      N: 25,
      p: 0.6,
      k: 4,
      composeR: false,
      rDirect: 3,
      If: 25000,
    },
    expected: {
      // Corrected per working paper v2.5.9 (2 Jul 2026 erratum fix):
      // M = 3·4·0.6/(1+3·0.6) = 2.5714; Investment = 25k·(10 + 4·15) = €1.75M.
      multiple: 2.57,
      investmentEUR: 1_750_000,
      repaymentEUR: 4_500_000,
    },
  },
  {
    id: "B-20",
    name: "Case B · 20% success",
    description: "I_f = €50k, I_s = €250k (k=5), r=3, p=0.20",
    patch: {
      N: 25,
      p: 0.2,
      k: 5,
      composeR: false,
      rDirect: 3,
      If: 50000,
    },
    expected: {
      multiple: 1.67,
      investmentEUR: 2_250_000,
      repaymentEUR: 3_750_000,
    },
  },
  {
    id: "B-40",
    name: "Case B · 40% success",
    description: "I_f = €50k, I_s = €250k (k=5), r=3, p=0.40",
    patch: {
      N: 25,
      p: 0.4,
      k: 5,
      composeR: false,
      rDirect: 3,
      If: 50000,
    },
    expected: {
      multiple: 2.31,
      investmentEUR: 3_250_000,
      repaymentEUR: 7_500_000,
    },
  },
  {
    id: "B-60",
    name: "Case B · 60% success",
    description: "I_f = €50k, I_s = €250k (k=5), r=3, p=0.60",
    patch: {
      N: 25,
      p: 0.6,
      k: 5,
      composeR: false,
      rDirect: 3,
      If: 50000,
    },
    expected: {
      multiple: 2.65,
      investmentEUR: 4_250_000,
      repaymentEUR: 11_250_000,
    },
  },
];

export const fmtMultiple = (x: number) =>
  Number.isFinite(x) ? `${x.toFixed(2)}×` : "—";

export const fmtPct = (x: number) =>
  Number.isFinite(x) ? `${(x * 100).toFixed(1)}%` : "—";

export const fmtEUR = (x: number) => {
  if (!Number.isFinite(x)) return "—";
  const abs = Math.abs(x);
  if (abs >= 1_000_000) return `€${(x / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `€${(x / 1_000).toFixed(0)}k`;
  return `€${x.toFixed(0)}`;
};

export const fmtNum = (x: number, digits = 2) =>
  Number.isFinite(x) ? x.toFixed(digits) : "—";

export const annualizedReturn = (multiple: number, years: number) =>
  years > 0 && multiple > 0 ? Math.pow(multiple, 1 / years) - 1 : 0;

export const variableLegend = {
  financial: [
    { sym: "M", name: "Single-cycle multiple", role: "Core financial outcome.", eq: "M = \\dfrac{r k p}{1 + (k-1)p}" },
    { sym: "M_{\\mathrm{total}}", name: "Evergreen multiple", role: "Compounded across c cycles.", eq: "M_{\\mathrm{total}} = M^{c}" },
    { sym: "p", name: "Survival probability", role: "Shared with the impact equation.", eq: "p = S/N" },
    { sym: "k", name: "Capital concentration", role: "Follow-on multiplier into survivors.", eq: "I_s = k I_f" },
    { sym: "r", name: "Repayment cap", role: "Total repayment claim.", eq: "r = 1+\\delta+\\pi+\\rho+\\lambda" },
    { sym: "N", name: "Companies funded", role: "Portfolio scale.", eq: "F + S = N" },
    { sym: "c", name: "Evergreen cycles", role: "Number of recycle rounds.", eq: "" },
    { sym: "W_t", name: "Fund wealth at time t", role: "Evergreen capital tracker.", eq: "W_{t+1} = \\eta W_t M" },
  ],
  impact: [
    { sym: "I", name: "Impact outcome", role: "Infrastructure-creation measure.", eq: "I = N\\,p\\,L\\,o\\,d\\,a\\,e" },
    { sym: "L", name: "Company lifetime", role: "Years a survivor remains active.", eq: "L(U)=L_0(1-\\alpha U)" },
    { sym: "o", name: "Openness retention", role: "Stays open-source over time.", eq: "o(U)=o_0(1-\\beta U)" },
    { sym: "d", name: "Sovereignty retention", role: "Governance and IP stay European.", eq: "d(U)=d_0(1-\\gamma U)" },
    { sym: "a", name: "Adoption factor", role: "Real production deployments.", eq: "" },
    { sym: "e", name: "Ecosystem spillover", role: "Forks, contributors, standards.", eq: "" },
  ],
  theology: [
    { sym: "\\delta", name: "Damnum emergens", role: "Real expenses (licit).", eq: "" },
    { sym: "\\pi", name: "Poena conventionalis", role: "Bounded penalty (licit).", eq: "" },
    { sym: "\\rho", name: "Periculum sortis", role: "Risk of default (constrained).", eq: "" },
    { sym: "\\lambda", name: "Lucrum cessans", role: "Opportunity cost (target ≈ 0).", eq: "" },
    { sym: "U", name: "Usury pressure", role: "Weighted extractive pressure.", eq: "U = 0.5\\rho + \\lambda" },
    { sym: "T", name: "Theological integrity", role: "Moral acceptability score.", eq: "T = 1 - U + \\mu\\eta" },
    { sym: "\\eta", name: "Reinvestment ratio", role: "Share recycled into new productive activity.", eq: "" },
    { sym: "\\mu", name: "Reinvestment weight", role: "How much reinvestment lifts T.", eq: "" },
    { sym: "M_{\\mathrm{licit}}", name: "Licit multiple component", role: "Tied to principal, expenses, penalties.", eq: "M_{\\mathrm{licit}} = \\dfrac{(1+\\delta+\\pi)kp}{1+(k-1)p}" },
    { sym: "M_{\\mathrm{usury}}", name: "Usury-linked component", role: "Risk-pricing + opportunity-cost claims.", eq: "M_{\\mathrm{usury}} = \\dfrac{(\\rho+\\lambda)kp}{1+(k-1)p}" },
  ],
  company: [
    { sym: "X_t", name: "Company state vector", role: "Bundles team, salary, opex, revenue, cash, and traction.", eq: "X_t=(N_t,W_t,O_t,R_t,C_t,Q_t,P_t,A_t,B_t)" },
    { sym: "\\text{CashOpex}", name: "Cash operating expense", role: "Payroll plus non-payroll opex.", eq: "\\text{CashOpex}_{i,t}=N_t W_t + O_{i,t}" },
    { sym: "\\text{EBITDA}", name: "EBITDA", role: "Sustainability indicator (not a valuation proxy).", eq: "\\text{EBITDA}_{i,t}=R_{i,t}-\\text{CashOpex}_{i,t}" },
    { sym: "\\text{FCF}", name: "Free cash flow", role: "Bridge from operating success to redemption.", eq: "\\text{FCF}_{i,t}=\\text{EBITDA}-\\text{Tax}-\\text{Capex}-\\Delta\\text{NWC}" },
    { sym: "L^{\\star}_{i,t}", name: "Resilience reserve", role: "Resilience floor before any redemption.", eq: "L^{\\star}_{i,t}=\\max(L_i,\\rho_i\\tfrac{\\text{CashOpex}}{12},S_{i,t})" },
    { sym: "\\text{ResGap}", name: "Reserve gap", role: "Cash needed to refill L*.", eq: "\\text{ResGap}=\\max(0,L^{\\star}-(C^{pre}+\\text{FCF}))" },
    { sym: "\\gamma_{i,t}", name: "Reinvest share", role: "Time-varying split: γ^early > γ^late.", eq: "\\text{Reinvest}=\\gamma\\cdot\\text{DistCash}" },
    { sym: "\\kappa_i", name: "Company cap multiple", role: "Caps cumulative redemption.", eq: "\\Omega_{i,t}=\\kappa_i\\sum_{\\tau\\leq t} I_{i,\\tau}" },
    { sym: "T_{i,t}", name: "Redemption trigger", role: "EBITDA>0, DistCash>0, CumRed<Ω.", eq: "T_{i,t}=\\mathbf{1}[\\cdot]" },
    { sym: "\\text{Red}_{i,t}", name: "Period redemption", role: "Capped distributable cash to the Fund.", eq: "\\text{Red}=T\\cdot\\min(\\text{RedBase},\\Omega-\\text{CumRed}_{t-1})" },
    { sym: "I^{net}_i", name: "Net usable capital", role: "Headline ticket less SO + incorporation costs.", eq: "I^{net}_i=I^{gross}_i - C^{SO}_i - C^{inc}_i" },
    { sym: "Z^{SO}_{i,t}", name: "Steward-ownership flag", role: "Admissibility gate: must be 1 at closing.", eq: "I^{gross}_{i,t}>0 \\Rightarrow Z^{SO}_{i,t}=1" },
  ],
  cooperative: [
    { sym: "\\Pi_t", name: "Fund inflow", role: "Aggregate company redemption.", eq: "\\Pi_t=\\sum_i \\text{Red}_{i,t}" },
    { sym: "F^{gross}_0", name: "Gross launch cash", role: "Member capital plus NPV loan.", eq: "F^{gross}_0=K^{members}_0 + L^{NPV}_0" },
    { sym: "F^{deploy}_0", name: "Net deployable cash", role: "After setup costs and reserve.", eq: "F^{deploy}_0=F^{gross}_0 - C^{coop} - C^{stich} - C^{gold} - E^{\\star}_0" },
    { sym: "DS^{NPV}_t", name: "Loan debt service", role: "Interest + principal on the NPV loan.", eq: "DS^{NPV}_t=\\text{Int}^{NPV}_t+\\text{Prin}^{NPV}_t" },
    { sym: "\\text{Net}_t", name: "Net cooperative proceeds", role: "Gross less coop costs, taxes, liabilities, debt service.", eq: "\\text{Net}=\\Pi+\\text{Liq}+\\text{Other}-O^{coop}-\\text{Tax}^{coop}-\\text{Liab}-DS^{NPV}" },
    { sym: "E_t", name: "Evergreen pot", role: "Compounding reserve, recursion W_{t+1}=ηW_tM lives here.", eq: "E_{t+1}=E_t+\\text{ReinvestFund}_t-\\text{NewDeploy}_t" },
    { sym: "\\eta_t", name: "Cooperative reinvest share", role: "Policy share, overridden by E* floor.", eq: "\\text{Reinvest}=\\min(\\text{Avail},\\max(\\eta\\cdot\\text{Avail},E^{\\star}-E))" },
    { sym: "\\text{DistPool}_t", name: "Member distribution pool", role: "Available after reserve and reinvest.", eq: "\\text{DistPool}_t=\\text{Avail}_t-\\text{ReinvestFund}_t" },
    { sym: "K_{m,v}, u_{m,v}", name: "Vintage capital and units", role: "Per-vintage subscription accounting.", eq: "" },
    { sym: "r_{m,v}", name: "Vintage cap multiple", role: "Default 3× contributed capital.", eq: "H^{cap}_{m,v,t}=r_{m,v}K_{m,v}-\\text{CumDist}_{m,v,t-1}" },
    { sym: "\\text{Dist}_{m,v,t}", name: "Member payout", role: "Pro-rata, clipped at headroom, residual recycled.", eq: "\\text{Dist}_{m,v,t}=\\min\\left(\\tfrac{u_{m,v}}{\\sum u}\\text{DistPool}, H^{cap}\\right)" },
  ],
};

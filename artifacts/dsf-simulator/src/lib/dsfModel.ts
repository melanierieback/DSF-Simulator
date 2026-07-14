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
   *  Written by the Ergodicity Lab page when a simulation completes.
   *  Used in computeAll when includeErgodicityInResults is true. */
  ergodicEffectiveSurvivalRate: number;
  /** Theological mode for computing usury pressure U and the licit/usury M split.
   *  Key must match one of THEOLOGICAL_MODES. Defaults to "dsf_working" (the original
   *  0.5·ρ + λ formula). Unknown or absent keys fall back to "dsf_working" silently. */
  theologicalMode: string;
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
  theologicalMode: "dsf_working",
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
  | "dsf_working"
  | "aquinas_mutuum"
  | "aquinas_societas"
  | "olivi"
  | "salamanca";

export type TheologicalModeConfig = {
  key: TheologicalModeKey;
  label: string;
  wDelta: number;
  wPi: number;
  wRho: number;
  wLambda: number;
  rationale: string;
  source: string;
};

export const THEOLOGICAL_MODES: TheologicalModeConfig[] = [
  {
    key: "dsf_working",
    label: "DSF working baseline",
    wDelta: 0, wPi: 0, wRho: 0.50, wLambda: 1.00,
    rationale: "U = 0.5·ρ + λ. Strict on lucrum cessans, half-penalizes risk-pricing. An Aquinas-leaning hybrid that does not yet fully credit the equity / societas structure.",
    source: "DSF working paper baseline. The ½ weight on ρ reflects partial legitimation of periculum sortis without yet distinguishing mutuum from societas.",
  },
  {
    key: "aquinas_mutuum",
    label: "Aquinas — loan (mutuum)",
    wDelta: 0, wPi: 0, wRho: 1.00, wLambda: 1.00,
    rationale: "Strict loan-bound reading. Lucrum cessans refused; in a loan the lender bears no real risk to principal, so pricing risk is illicit too. This is not DSF's actual instrument.",
    source: "Aquinas, Summa Theologiae II-II q.78: damnum emergens admitted; lucrum cessans refused; a return is licit only where the capital provider shares the venture's risk as a partner.",
  },
  {
    key: "aquinas_societas",
    label: "Aquinas — partnership (societas)",
    wDelta: 0, wPi: 0, wRho: 0.00, wLambda: 1.00,
    rationale: "Instrument-aware Thomistic reading. Genuine risk-bearing in a partnership legitimates a profit share; periculum sortis (ρ) is licit as actually borne. Lucrum cessans still refused.",
    source: "Aquinas, Summa Theologiae II-II q.78: a return is licit where the capital provider shares the venture's risk as a partner rather than receiving a guaranteed return as a lender.",
  },
  {
    key: "olivi",
    label: "Olivi — committed capital",
    wDelta: 0, wPi: 0, wRho: 0.25, wLambda: 0.50,
    rationale: "Capital genuinely committed to productive use has a profit-bearing quality; lucrum cessans accepted conditionally. Intermediate between Thomistic and Salamanca positions.",
    source: "Peter John Olivi, Tractatus de contractibus: capital committed to productive trade has a profit-bearing quality; risk and productive commitment give rise to legitimate interesse.",
  },
  {
    key: "salamanca",
    label: "School of Salamanca",
    wDelta: 0, wPi: 0, wRho: 0.15, wLambda: 0.25,
    rationale: "Molina, Lessius, and de Lugo progressively legitimate lucrum cessans and periculum sortis when priced according to common estimation and real market conditions. Most permissive.",
    source: "School of Salamanca (Molina, Lessius, de Lugo): lucrum cessans and periculum sortis progressively recognized when grounded in real conditions and common estimation. TODO: fuller bibliography.",
  },
];

/** Returns the config for a given theological mode key.
 *  Falls back silently to 'dsf_working' for unknown or absent keys. */
export function getTheologicalModeConfig(key: string): TheologicalModeConfig {
  return THEOLOGICAL_MODES.find((m) => m.key === key) ?? THEOLOGICAL_MODES[0];
}

/** Mode-aware usury pressure.
 *  U(mode) = w_delta·δ + w_pi·π + w_rho·ρ + w_lambda·λ
 *
 *  Acceptance values (δ=0.9, π=0.2, ρ=0.5, λ=0.3, r=2.90):
 *    dsf_working      → 0.55   (0.50×0.5 + 1.00×0.3 = 0.55 ✓)
 *    aquinas_mutuum   → 0.80   (1.00×0.5 + 1.00×0.3 = 0.80 ✓)
 *    aquinas_societas → 0.30   (0.00×0.5 + 1.00×0.3 = 0.30 ✓)
 *    olivi            → 0.275  (0.25×0.5 + 0.50×0.3 = 0.275 ✓)
 *    salamanca        → 0.15   (0.15×0.5 + 0.25×0.3 = 0.15 ✓)
 *
 *  DSF target cap (δ=1.5, π=0.1, ρ=0.4, λ=0):
 *    dsf_working      → 0.20   (0.50×0.4 + 0 = 0.20 ✓)
 *    aquinas_societas → 0.00   (0.00×0.4 + 0 = 0.00 ✓)
 */
export function computeUsuryByMode(
  delta: number,
  pi: number,
  rho: number,
  lambda: number,
  theologicalMode: string,
): number {
  const m = getTheologicalModeConfig(theologicalMode);
  return m.wDelta * delta + m.wPi * pi + m.wRho * rho + m.wLambda * lambda;
}

/** Mode-weighted usury component of M (display-only — does not change M).
 *  M_usury_mode = (w_rho·ρ + w_lambda·λ) · kp / (1+(k-1)p)
 */
export function computeMUsuryMode(
  rho: number,
  lambda: number,
  k: number,
  p: number,
  theologicalMode: string,
): number {
  const m = getTheologicalModeConfig(theologicalMode);
  return ((m.wRho * rho + m.wLambda * lambda) * k * p) / (1 + (k - 1) * p);
}

/** Mode-weighted licit component of M (display-only).
 *  M_licit_mode = M − M_usury_mode
 *  = (1 + δ + π + (1−w_rho)·ρ + (1−w_lambda)·λ) · kp / (1+(k-1)p)
 */
export function computeMLicitMode(
  delta: number,
  pi: number,
  rho: number,
  lambda: number,
  k: number,
  p: number,
  theologicalMode: string,
): number {
  const m = getTheologicalModeConfig(theologicalMode);
  const rLicit =
    1 + delta + pi + (1 - m.wRho) * rho + (1 - m.wLambda) * lambda;
  return (rLicit * k * p) / (1 + (k - 1) * p);
}

/** Returns U and T under all five modes for the current cap composition.
 *  Used by the cross-mode comparison panel in the Theology tab.
 */
export function computeTheologicalModeComparison(
  delta: number,
  pi: number,
  rho: number,
  lambda: number,
  mu: number,
  eta: number,
) {
  return THEOLOGICAL_MODES.map((mode) => {
    const U = computeUsuryByMode(delta, pi, rho, lambda, mode.key);
    const T = computeT(U, mu, eta);
    return {
      key: mode.key,
      label: mode.label,
      wRho: mode.wRho,
      wLambda: mode.wLambda,
      U,
      T,
      rationale: mode.rationale,
      source: mode.source,
    };
  });
}

export const computeT = (U: number, mu: number, eta: number) =>
  1 - U + mu * eta;

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
  // When ergodicity toggle is ON, route survival-dependent calculations
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
  const MlicitMode = computeMLicitMode(params.delta, params.pi, params.rho, params.lambda, params.k, effectiveP, params.theologicalMode);
  const MusuryMode = computeMUsuryMode(params.rho, params.lambda, params.k, effectiveP, params.theologicalMode);
  // U is now mode-aware; DSF working baseline reproduces the original 0.5·ρ + λ exactly.
  const U = computeUsuryByMode(params.delta, params.pi, params.rho, params.lambda, params.theologicalMode);
  const T = computeT(U, params.mu, params.eta);
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

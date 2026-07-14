// Verdict predicates (pack v2 I.5; paper §§4.8–4.10).
//
// These predicates are our formalizations of each school's operative test —
// not quotations of the sources; every parameter is exposed so each encoding
// can be contested (provenance-transparency convention, paper v2.7.5).
//
// X = (r−1) − (ψ_δ·δ + ψ_π·π) — the EXCESS claim above substantiated
// compensation. IMPORTANT: the Salamanca test annualizes the EXCESS X, not
// the whole cap (paper §4.9; v2.7.2 corrected an earlier whole-cap form —
// do not implement r^(1/T)).
//
// Acceptance (DSF defaults δ=1.3, π=0.2, ρ=0.3, λ=0.1, r=2.9, ψ≡1,
// TLambda=10, gAlt=0.04, yAlt=0.05, rStar=0.05, epsBand=0.02) — verified
// 2 Jul 2026:
//   X = 0.40
//   Salamanca annualized excess = 1.4^0.1 − 1 = 3.42% ≤ 7% → licit
//   (whole-cap version would give 11.2% → wrongly illicit)
//   Olivi: Λ_time = e^0.4 − 1 = 0.4918 ≥ 0.40 → licit when φ ≥ φ_min
//   (Λ_ens = 1.05^10 − 1 = 0.6289 shown for comparison)
//   Aquinas at φ = 0.95: (1−φ)·X = 0.020 → boundary; at φ = 1: licit
//   Monti: X = 0.40 > 0 → not cost-recovery (expected — a fund, not a mons)

export type VerdictStatus = "licit" | "boundary" | "illicit";

export type VerdictInputs = {
  delta: number;
  pi: number;
  rho: number;
  lambda: number;
  /** Composed or direct repayment cap r (use the live derived r) */
  r: number;
  phi: number;
  psiDelta: number;
  psiPi: number;
  psiRho: number;
  psiLambda: number;
  phiMin: number;
  gAlt: number;
  yAlt: number;
  TLambda: number;
  rStar: number;
  epsBand: number;
  screenNecessity: boolean;
  screenMarketPower: boolean;
  psiMin: number;
};

export type SchoolVerdict = {
  key: "aquinas" | "olivi" | "salamanca" | "monti";
  label: string;
  status: VerdictStatus;
  /** The quantity the school's test actually examines, for display */
  testValue: number;
  /** The threshold it is compared against */
  threshold: number;
  detail: string;
};

export type VerdictResult = {
  /** Excess claim above substantiated compensation */
  X: number;
  /** Operative counterfactual: time-average growth over TLambda */
  LambdaTime: number;
  /** Comparison counterfactual: ensemble mean over TLambda */
  LambdaEns: number;
  /** Annualized excess used by the Salamanca band */
  salamancaAnnualizedExcess: number;
  aquinas: SchoolVerdict;
  olivi: SchoolVerdict;
  salamanca: SchoolVerdict;
  monti: SchoolVerdict;
};

const EPS = 1e-9;
/** Aquinas boundary width on (1−φ)·X (pack v2 I.5) */
const AQUINAS_BOUNDARY = 0.02;

export function computeVerdicts(v: VerdictInputs): VerdictResult {
  const X = v.r - 1 - (v.psiDelta * v.delta + v.psiPi * v.pi);

  // Λ thresholds (paper §4.8): Λ_time is OPERATIVE (founder decision);
  // Λ_ens is displayed for comparison only.
  const LambdaTime = Math.exp(v.gAlt * v.TLambda) - 1;
  const LambdaEns = Math.pow(1 + v.yAlt, v.TLambda) - 1;

  // Aquinas: fully contingent, or claim ≤ substantiated compensation.
  const aquinasValue = (1 - v.phi) * Math.max(0, X);
  const aquinasStatus: VerdictStatus =
    aquinasValue <= EPS
      ? "licit"
      : aquinasValue <= AQUINAS_BOUNDARY + EPS // ε absorbs FP dust at the exact boundary
        ? "boundary"
        : "illicit";

  // Olivi: capital committed (φ ≥ φ_min) and excess within the committed-
  // capital counterfactual Λ_time.
  const oliviOk = v.phi >= v.phiMin && X <= LambdaTime;

  // Salamanca: annualized EXCESS within the just-rate band, subject to the
  // screens and the substantiation threshold.
  const annualizedExcess = Math.pow(1 + Math.max(0, X), 1 / v.TLambda) - 1;
  const minPsi = Math.min(v.psiDelta, v.psiPi, v.psiRho, v.psiLambda);
  const salamancaOk =
    annualizedExcess <= v.rStar + v.epsBand &&
    v.screenNecessity &&
    v.screenMarketPower &&
    minPsi >= v.psiMin;

  // Monti design point: claim ≤ substantiated compensation (cost recovery).
  const montiOk = X <= EPS;

  return {
    X,
    LambdaTime,
    LambdaEns,
    salamancaAnnualizedExcess: annualizedExcess,
    aquinas: {
      key: "aquinas",
      label: "Aquinas",
      status: aquinasStatus,
      testValue: aquinasValue,
      threshold: 0,
      detail:
        aquinasStatus === "licit"
          ? "Claim is fully contingent (φ → 1) or does not exceed substantiated compensation."
          : aquinasStatus === "boundary"
            ? `Non-contingent excess (1−φ)·X = ${aquinasValue.toFixed(3)} sits within the 0.02 boundary band.`
            : `Non-contingent excess (1−φ)·X = ${aquinasValue.toFixed(3)} > 0 — a guaranteed claim above substantiated compensation.`,
    },
    olivi: {
      key: "olivi",
      label: "Olivi",
      status: oliviOk ? "licit" : "illicit",
      testValue: X,
      threshold: LambdaTime,
      detail: oliviOk
        ? `Capital is committed (φ ≥ ${v.phiMin.toFixed(2)}) and the excess X = ${X.toFixed(2)} sits within Λ_time = ${LambdaTime.toFixed(4)}.`
        : v.phi < v.phiMin
          ? `Capital not committed enough: φ = ${v.phi.toFixed(2)} < φ_min = ${v.phiMin.toFixed(2)}.`
          : `Excess X = ${X.toFixed(2)} exceeds the committed-capital counterfactual Λ_time = ${LambdaTime.toFixed(4)}.`,
    },
    salamanca: {
      key: "salamanca",
      label: "Salamanca & late scholastics",
      status: salamancaOk ? "licit" : "illicit",
      testValue: annualizedExcess,
      threshold: v.rStar + v.epsBand,
      detail: salamancaOk
        ? `Annualized excess (1+X)^(1/T)−1 = ${(annualizedExcess * 100).toFixed(2)}% ≤ r* + ε = ${((v.rStar + v.epsBand) * 100).toFixed(0)}%, screens pass, min ψ ≥ ${v.psiMin.toFixed(2)}.`
        : annualizedExcess > v.rStar + v.epsBand
          ? `Annualized excess ${(annualizedExcess * 100).toFixed(2)}% exceeds the band r* + ε = ${((v.rStar + v.epsBand) * 100).toFixed(0)}%.`
          : minPsi < v.psiMin
            ? `Substantiation screen fails: min ψ = ${minPsi.toFixed(2)} < ${v.psiMin.toFixed(2)}.`
            : "A screen fails: pricing against necessity or market power.",
    },
    monti: {
      key: "monti",
      label: "Monti di Pietà (design point)",
      status: montiOk ? "licit" : "illicit",
      testValue: X,
      threshold: 0,
      detail: montiOk
        ? "Claim does not exceed substantiated compensation — cost recovery."
        : `X = ${X.toFixed(2)} > 0: not cost-recovery (expected — this is a fund, not a mons).`,
    },
  };
}
